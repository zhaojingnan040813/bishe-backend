import Interaction from '../models/Interaction.js'
import Drug from '../models/Drug.js'
import { aiService } from './AIService.js'
import { logger } from '../utils/logger.js'

/**
 * 相互作用服务类
 * 实现药物相互作用检测、查询和存储
 */
class InteractionService {
  /**
   * 检测多个药物之间的相互作用
   * 实现缓存优先策略：优先查询数据库，不存在时调用AI
   * @param {string[]} drugIds - 药物ID数组
   * @returns {Promise<Object>} 检测结果
   */
  async checkInteractions(drugIds) {
    try {
      // 参数验证
      if (!Array.isArray(drugIds) || drugIds.length < 2) {
        throw new Error('至少需要2个药物ID进行相互作用检测')
      }

      // 去重
      const uniqueDrugIds = [...new Set(drugIds)]
      if (uniqueDrugIds.length < 2) {
        throw new Error('至少需要2个不同的药物进行相互作用检测')
      }

      logger.info('开始检测药物相互作用', {
        drugIds: uniqueDrugIds,
        count: uniqueDrugIds.length,
      })

      // 1. 查询所有药物信息
      const drugs = await Drug.find({ _id: { $in: uniqueDrugIds } }).lean()

      if (drugs.length !== uniqueDrugIds.length) {
        throw new Error('部分药物ID不存在')
      }

      // 创建药物ID到药物对象的映射
      const drugMap = new Map(drugs.map(drug => [drug._id.toString(), drug]))

      // 2. 生成所有药物对的组合
      const pairs = []
      for (let i = 0; i < uniqueDrugIds.length; i++) {
        for (let j = i + 1; j < uniqueDrugIds.length; j++) {
          pairs.push([uniqueDrugIds[i], uniqueDrugIds[j]])
        }
      }

      logger.info('生成药物对组合', { pairCount: pairs.length })

      // 3. 查询每对药物的相互作用
      const interactions = []
      const missingPairs = []
      let dataSource = 'database' // 数据来源：database, ai, mixed

      for (const [drugId1, drugId2] of pairs) {
        // 查询数据库中是否存在该相互作用
        const existingInteraction = await Interaction.findBetweenDrugs(
          drugId1,
          drugId2
        )

        if (existingInteraction) {
          interactions.push(existingInteraction)
          logger.info('从数据库获取相互作用', {
            drug1: existingInteraction.drug1Name,
            drug2: existingInteraction.drug2Name,
          })
        } else {
          // 记录缺失的药物对
          missingPairs.push({
            drugId1,
            drugId2,
            drug1: drugMap.get(drugId1),
            drug2: drugMap.get(drugId2),
          })
        }
      }

      // 4. 如果有缺失的相互作用，调用AI分析
      if (missingPairs.length > 0) {
        logger.info('部分相互作用数据缺失，调用AI分析', {
          missingCount: missingPairs.length,
        })

        // 调用AI分析所有药物的相互作用
        const drugNames = drugs.map(drug => drug.name)
        const aiResult = await aiService.analyzeInteractions(drugNames)

        // 验证AI返回的数据
        if (!aiResult.interactions || !Array.isArray(aiResult.interactions)) {
          throw new Error('AI返回的相互作用数据格式不正确')
        }

        // 处理AI返回的相互作用数据
        for (const aiInteraction of aiResult.interactions) {
          // 查找对应的药物对
          const pair = missingPairs.find(
            p =>
              (p.drug1.name === aiInteraction.drug1 &&
                p.drug2.name === aiInteraction.drug2) ||
              (p.drug1.name === aiInteraction.drug2 &&
                p.drug2.name === aiInteraction.drug1)
          )

          if (pair) {
            // 保存AI分析结果到数据库
            const savedInteraction = await this.saveInteraction({
              drug1Id: pair.drugId1,
              drug2Id: pair.drugId2,
              drug1Name: pair.drug1.name,
              drug2Name: pair.drug2.name,
              interactionType: aiInteraction.interactionType,
              severity: aiInteraction.severity,
              description: aiInteraction.description,
              recommendation: aiInteraction.recommendation,
              source: 'ai',
            })

            interactions.push(savedInteraction)

            logger.info('AI分析结果已保存', {
              drug1: pair.drug1.name,
              drug2: pair.drug2.name,
              severity: aiInteraction.severity,
            })
          }
        }

        // 更新数据来源标识
        if (interactions.length === missingPairs.length) {
          dataSource = 'ai'
        } else {
          dataSource = 'mixed'
        }
      }

      // 5. 计算整体风险等级
      const riskLevel = this.calculateOverallRisk(interactions)

      logger.info('药物相互作用检测完成', {
        drugCount: uniqueDrugIds.length,
        interactionCount: interactions.length,
        riskLevel,
        source: dataSource,
      })

      return {
        interactions,
        riskLevel,
        source: dataSource,
        drugCount: uniqueDrugIds.length,
        interactionCount: interactions.length,
      }
    } catch (error) {
      logger.error('检测药物相互作用失败', {
        drugIds,
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * 查找两种药物之间的相互作用
   * @param {string} drugId1 - 药物1的ID
   * @param {string} drugId2 - 药物2的ID
   * @returns {Promise<Object|null>} 相互作用对象或null
   */
  async findInteraction(drugId1, drugId2) {
    try {
      if (!drugId1 || !drugId2) {
        throw new Error('药物ID不能为空')
      }

      if (drugId1 === drugId2) {
        throw new Error('不能查询同一药物的相互作用')
      }

      const interaction = await Interaction.findBetweenDrugs(drugId1, drugId2)

      if (interaction) {
        logger.info('查询相互作用', {
          drug1Id: drugId1,
          drug2Id: drugId2,
          found: true,
        })
      } else {
        logger.info('查询相互作用', {
          drug1Id: drugId1,
          drug2Id: drugId2,
          found: false,
        })
      }

      return interaction
    } catch (error) {
      logger.error('查询相互作用失败', {
        drug1Id: drugId1,
        drug2Id: drugId2,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 保存相互作用记录
   * @param {Object} interactionData - 相互作用数据
   * @returns {Promise<Object>} 保存的相互作用对象
   */
  async saveInteraction(interactionData) {
    try {
      // 验证必需字段
      const requiredFields = [
        'drug1Id',
        'drug2Id',
        'drug1Name',
        'drug2Name',
        'interactionType',
        'severity',
        'description',
        'recommendation',
      ]

      for (const field of requiredFields) {
        if (!interactionData[field]) {
          throw new Error(`缺少必需字段: ${field}`)
        }
      }

      // 验证严重程度
      if (!['low', 'medium', 'high'].includes(interactionData.severity)) {
        throw new Error('严重程度必须是 low, medium 或 high')
      }

      // 检查是否已存在
      const existing = await Interaction.findBetweenDrugs(
        interactionData.drug1Id,
        interactionData.drug2Id
      )

      if (existing) {
        logger.info('相互作用已存在，返回现有记录', {
          drug1: interactionData.drug1Name,
          drug2: interactionData.drug2Name,
        })
        return existing
      }

      // 创建相互作用记录
      const interaction = new Interaction({
        ...interactionData,
        source: interactionData.source || 'database',
      })

      await interaction.save()

      logger.info('保存相互作用记录', {
        id: interaction._id,
        drug1: interaction.drug1Name,
        drug2: interaction.drug2Name,
        severity: interaction.severity,
        source: interaction.source,
      })

      return interaction.toObject()
    } catch (error) {
      logger.error('保存相互作用记录失败', {
        drug1: interactionData?.drug1Name,
        drug2: interactionData?.drug2Name,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 计算整体风险等级
   * 基于所有相互作用的严重程度
   * @param {Array} interactions - 相互作用数组
   * @returns {string} 风险等级：low, medium, high
   */
  calculateOverallRisk(interactions) {
    if (!interactions || interactions.length === 0) {
      return 'low'
    }

    // 统计各严重程度的数量
    const severityCounts = {
      high: 0,
      medium: 0,
      low: 0,
    }

    for (const interaction of interactions) {
      const severity = interaction.severity || 'low'
      severityCounts[severity]++
    }

    // 风险等级计算逻辑：
    // - 如果有任何高风险相互作用，整体风险为高
    // - 如果有2个或以上中风险相互作用，整体风险为高
    // - 如果有1个中风险相互作用，整体风险为中
    // - 其他情况为低风险

    if (severityCounts.high > 0) {
      return 'high'
    }

    if (severityCounts.medium >= 2) {
      return 'high'
    }

    if (severityCounts.medium === 1) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * 根据药物ID查询所有相关的相互作用
   * @param {string} drugId - 药物ID
   * @returns {Promise<Array>} 相互作用数组
   */
  async findByDrugId(drugId) {
    try {
      if (!drugId) {
        throw new Error('药物ID不能为空')
      }

      const interactions = await Interaction.findByDrugId(drugId)

      logger.info('查询药物的所有相互作用', {
        drugId,
        count: interactions.length,
      })

      return interactions
    } catch (error) {
      logger.error('查询药物相互作用失败', {
        drugId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 根据严重程度查询相互作用
   * @param {string} severity - 严重程度：low, medium, high
   * @returns {Promise<Array>} 相互作用数组
   */
  async findBySeverity(severity) {
    try {
      if (!['low', 'medium', 'high'].includes(severity)) {
        throw new Error('严重程度必须是 low, medium 或 high')
      }

      const interactions = await Interaction.findBySeverity(severity)

      logger.info('按严重程度查询相互作用', {
        severity,
        count: interactions.length,
      })

      return interactions
    } catch (error) {
      logger.error('按严重程度查询相互作用失败', {
        severity,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 删除相互作用记录
   * @param {string} id - 相互作用ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    try {
      if (!id) {
        throw new Error('相互作用ID不能为空')
      }

      const result = await Interaction.findByIdAndDelete(id)

      if (!result) {
        throw new Error('相互作用记录不存在')
      }

      logger.info('删除相互作用记录', {
        id,
        drug1: result.drug1Name,
        drug2: result.drug2Name,
      })

      return true
    } catch (error) {
      logger.error('删除相互作用记录失败', {
        id,
        error: error.message,
      })
      throw error
    }
  }
}

// 导出单例
export const interactionService = new InteractionService()
