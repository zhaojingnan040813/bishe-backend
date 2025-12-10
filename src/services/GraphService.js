import Drug from '../models/Drug.js'
import Interaction from '../models/Interaction.js'
import { logger } from '../utils/logger.js'

/**
 * 图谱服务类
 * 实现药物关系图谱数据生成
 */
class GraphService {
  /**
   * 生成药物关系图谱数据
   * @param {string} [drugId] - 可选的药物ID，用于筛选特定药物及其关联
   * @returns {Promise<{nodes: Array, edges: Array}>} 图谱数据
   */
  async getGraphData(drugId = null) {
    try {
      logger.info('开始生成图谱数据', { drugId })

      let nodes = []
      let edges = []

      if (drugId) {
        // 如果指定了药物ID，只返回该药物及其相关药物
        const result = await this.getFilteredGraphData(drugId)
        nodes = result.nodes
        edges = result.edges
      } else {
        // 返回所有药物和相互作用
        const result = await this.getAllGraphData()
        nodes = result.nodes
        edges = result.edges
      }

      logger.info('图谱数据生成完成', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        filtered: !!drugId,
      })

      return {
        nodes,
        edges,
      }
    } catch (error) {
      logger.error('生成图谱数据失败', {
        drugId,
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * 获取所有药物和相互作用的图谱数据
   * @returns {Promise<{nodes: Array, edges: Array}>}
   */
  async getAllGraphData() {
    try {
      // 1. 查询所有药物
      const drugs = await Drug.find().lean()

      // 2. 生成节点数据
      const nodes = this.generateNodes(drugs)

      // 3. 查询所有相互作用
      const interactions = await Interaction.find().lean()

      // 4. 生成边数据
      const edges = this.generateEdges(interactions)

      return { nodes, edges }
    } catch (error) {
      logger.error('获取所有图谱数据失败', { error: error.message })
      throw error
    }
  }

  /**
   * 获取筛选后的图谱数据（特定药物及其关联）
   * @param {string} drugId - 药物ID
   * @returns {Promise<{nodes: Array, edges: Array}>}
   */
  async getFilteredGraphData(drugId) {
    try {
      // 1. 验证药物是否存在
      const targetDrug = await Drug.findById(drugId).lean()
      if (!targetDrug) {
        throw new Error('指定的药物不存在')
      }

      // 2. 查询该药物的所有相互作用
      const interactions = await Interaction.findByDrugId(drugId)

      if (interactions.length === 0) {
        // 如果没有相互作用，只返回该药物节点
        const nodes = this.generateNodes([targetDrug])
        return { nodes, edges: [] }
      }

      // 3. 收集所有相关药物的ID
      const relatedDrugIds = new Set()
      relatedDrugIds.add(drugId)

      for (const interaction of interactions) {
        const drug1IdStr = interaction.drug1Id.toString()
        const drug2IdStr = interaction.drug2Id.toString()
        relatedDrugIds.add(drug1IdStr)
        relatedDrugIds.add(drug2IdStr)
      }

      // 4. 查询所有相关药物
      const relatedDrugs = await Drug.find({
        _id: { $in: Array.from(relatedDrugIds) },
      }).lean()

      // 5. 生成节点数据
      const nodes = this.generateNodes(relatedDrugs)

      // 6. 生成边数据
      const edges = this.generateEdges(interactions)

      return { nodes, edges }
    } catch (error) {
      logger.error('获取筛选图谱数据失败', {
        drugId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 生成图谱节点数据
   * @param {Array} drugs - 药物数组
   * @returns {Array} 节点数组
   */
  generateNodes(drugs) {
    return drugs.map(drug => ({
      id: drug._id.toString(),
      name: drug.name,
      category: drug.category,
      value: this.calculateNodeValue(drug),
      source: drug.source || 'manual',
      // 额外信息，用于前端展示
      description: drug.description,
    }))
  }

  /**
   * 生成图谱边数据
   * @param {Array} interactions - 相互作用数组
   * @returns {Array} 边数组
   */
  generateEdges(interactions) {
    return interactions.map(interaction => ({
      source: interaction.drug1Id.toString(),
      target: interaction.drug2Id.toString(),
      value: this.calculateEdgeValue(interaction.severity),
      severity: interaction.severity,
      interactionType: interaction.interactionType || '未知',
      // 额外信息，用于前端展示
      description: interaction.description,
    }))
  }

  /**
   * 计算节点的值（大小/重要性）
   * 基于药物的相互作用数量
   * @param {Object} drug - 药物对象
   * @returns {number} 节点值
   */
  calculateNodeValue(drug) {
    // 基础值
    let value = 10

    // 可以根据药物的属性调整值
    // 例如：AI生成的药物值较小
    if (drug.source === 'ai') {
      value = 8
    }

    // 如果有副作用信息，增加值
    if (drug.sideEffects && drug.sideEffects.length > 0) {
      value += Math.min(drug.sideEffects.length, 5)
    }

    return value
  }

  /**
   * 计算边的值（权重）
   * 基于相互作用的严重程度
   * @param {string} severity - 严重程度：low, medium, high
   * @returns {number} 边的权重
   */
  calculateEdgeValue(severity) {
    const severityWeights = {
      low: 1,
      medium: 3,
      high: 5,
    }

    return severityWeights[severity] || 1
  }

  /**
   * 获取药物的相互作用统计
   * @param {string} drugId - 药物ID
   * @returns {Promise<Object>} 统计信息
   */
  async getDrugInteractionStats(drugId) {
    try {
      if (!drugId) {
        throw new Error('药物ID不能为空')
      }

      // 查询药物信息
      const drug = await Drug.findById(drugId).lean()
      if (!drug) {
        throw new Error('药物不存在')
      }

      // 查询所有相互作用
      const interactions = await Interaction.findByDrugId(drugId)

      // 统计各严重程度的数量
      const severityCounts = {
        high: 0,
        medium: 0,
        low: 0,
      }

      for (const interaction of interactions) {
        severityCounts[interaction.severity]++
      }

      const stats = {
        drugId,
        drugName: drug.name,
        totalInteractions: interactions.length,
        severityCounts,
        highRiskCount: severityCounts.high,
        mediumRiskCount: severityCounts.medium,
        lowRiskCount: severityCounts.low,
      }

      logger.info('获取药物相互作用统计', stats)

      return stats
    } catch (error) {
      logger.error('获取药物相互作用统计失败', {
        drugId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 获取图谱统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getGraphStats() {
    try {
      const [drugCount, interactionCount, severityCounts] = await Promise.all([
        Drug.countDocuments(),
        Interaction.countDocuments(),
        Interaction.aggregate([
          {
            $group: {
              _id: '$severity',
              count: { $sum: 1 },
            },
          },
        ]),
      ])

      const stats = {
        totalDrugs: drugCount,
        totalInteractions: interactionCount,
        severityDistribution: severityCounts.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
      }

      logger.info('获取图谱统计信息', stats)

      return stats
    } catch (error) {
      logger.error('获取图谱统计信息失败', { error: error.message })
      throw error
    }
  }
}

// 导出单例
export const graphService = new GraphService()
