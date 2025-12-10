import Drug from '../models/Drug.js'
import { aiService } from './AIService.js'
import { logger } from '../utils/logger.js'

/**
 * 药物服务类
 * 实现缓存优先策略：优先查询数据库，不存在时调用AI
 */
class DrugService {
  /**
   * 查询药物列表（分页）
   * @param {number} page - 页码（从1开始）
   * @param {number} limit - 每页数量
   * @returns {Promise<{drugs: Array, total: number, page: number, totalPages: number}>}
   */
  async findAll(page = 1, limit = 10) {
    try {
      // 参数验证
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      // 查询数据库
      const [drugs, total] = await Promise.all([
        Drug.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Drug.countDocuments(),
      ])

      logger.info('查询药物列表', {
        page: pageNum,
        limit: limitNum,
        total,
        count: drugs.length,
      })

      return {
        drugs,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      }
    } catch (error) {
      logger.error('查询药物列表失败', { error: error.message })
      throw error
    }
  }

  /**
   * 搜索药物（模糊匹配）
   * @param {string} name - 搜索关键词
   * @returns {Promise<Array>} 匹配的药物列表
   */
  async search(name) {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('搜索关键词不能为空')
      }

      const searchTerm = name.trim()
      if (searchTerm.length === 0) {
        throw new Error('搜索关键词不能为空')
      }

      // 使用正则表达式进行模糊匹配（不区分大小写）
      const regex = new RegExp(searchTerm, 'i')
      const drugs = await Drug.find({
        $or: [
          { name: regex },
          { genericName: regex },
        ],
      })
        .sort({ name: 1 })
        .lean()

      logger.info('搜索药物', {
        searchTerm,
        count: drugs.length,
      })

      return drugs
    } catch (error) {
      logger.error('搜索药物失败', {
        searchTerm: name,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 根据ID查询药物
   * @param {string} id - 药物ID
   * @returns {Promise<Object|null>} 药物对象或null
   */
  async findById(id) {
    try {
      if (!id) {
        throw new Error('药物ID不能为空')
      }

      const drug = await Drug.findById(id).lean()

      if (drug) {
        logger.info('查询药物详情', { id, found: true })
      } else {
        logger.info('查询药物详情', { id, found: false })
      }

      return drug
    } catch (error) {
      logger.error('查询药物详情失败', {
        id,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 创建药物记录
   * @param {Object} drugData - 药物数据
   * @returns {Promise<Object>} 创建的药物对象
   */
  async create(drugData) {
    try {
      // 验证必需字段
      if (!drugData.name) {
        throw new Error('药物名称不能为空')
      }
      if (!drugData.description) {
        throw new Error('药物描述不能为空')
      }
      if (!drugData.category) {
        throw new Error('药物分类不能为空')
      }

      // 检查是否已存在
      const existing = await Drug.findOne({ name: drugData.name })
      if (existing) {
        throw new Error(`药物 "${drugData.name}" 已存在`)
      }

      // 创建药物记录
      const drug = new Drug(drugData)
      await drug.save()

      logger.info('创建药物记录', {
        id: drug._id,
        name: drug.name,
        source: drug.source,
      })

      return drug.toObject()
    } catch (error) {
      logger.error('创建药物记录失败', {
        name: drugData?.name,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 根据名称查询或分析药物（缓存优先策略）
   * 优先查询数据库，不存在时调用AI接口
   * @param {string} name - 药物名称
   * @returns {Promise<{drug: Object, source: string}>}
   */
  async findOrAnalyze(name) {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('药物名称不能为空')
      }

      const drugName = name.trim()
      if (drugName.length === 0) {
        throw new Error('药物名称不能为空')
      }

      // 1. 优先查询数据库（缓存优先策略）
      const existingDrug = await Drug.findOne({
        $or: [
          { name: new RegExp(`^${drugName}$`, 'i') },
          { genericName: new RegExp(`^${drugName}$`, 'i') },
        ],
      }).lean()

      if (existingDrug) {
        logger.info('从数据库获取药物信息', {
          name: drugName,
          source: 'database',
        })

        return {
          drug: existingDrug,
          source: 'database',
        }
      }

      // 2. 数据库中不存在，调用AI接口（AI降级机制）
      logger.info('数据库中不存在药物，调用AI分析', { name: drugName })

      const aiResult = await aiService.analyzeDrug(drugName)

      // 3. 验证AI返回的数据完整性
      if (!aiResult.name || !aiResult.description || !aiResult.category) {
        throw new Error('AI返回的数据不完整，缺少必需字段')
      }

      // 4. 将AI分析结果存储到数据库（AI结果持久化）
      const drugData = {
        name: aiResult.name || drugName,
        genericName: aiResult.genericName,
        description: aiResult.description,
        category: aiResult.category,
        sideEffects: aiResult.sideEffects || [],
        contraindications: aiResult.contraindications || [],
        dosage: aiResult.dosage,
        aiAnalysis: JSON.stringify(aiResult),
        source: 'ai',
      }

      const newDrug = await this.create(drugData)

      logger.info('AI分析结果已保存到数据库', {
        name: drugName,
        id: newDrug._id,
        source: 'ai',
      })

      return {
        drug: newDrug,
        source: 'ai',
      }
    } catch (error) {
      logger.error('查询或分析药物失败', {
        name,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 根据名称查询药物（精确匹配）
   * @param {string} name - 药物名称
   * @returns {Promise<Object|null>} 药物对象或null
   */
  async findByName(name) {
    try {
      if (!name || typeof name !== 'string') {
        return null
      }

      const drugName = name.trim()
      if (drugName.length === 0) {
        return null
      }

      const drug = await Drug.findOne({
        $or: [
          { name: new RegExp(`^${drugName}$`, 'i') },
          { genericName: new RegExp(`^${drugName}$`, 'i') },
        ],
      }).lean()

      return drug
    } catch (error) {
      logger.error('根据名称查询药物失败', {
        name,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 更新药物信息
   * @param {string} id - 药物ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的药物对象
   */
  async update(id, updateData) {
    try {
      if (!id) {
        throw new Error('药物ID不能为空')
      }

      // 不允许更新某些字段
      delete updateData._id
      delete updateData.createdAt
      delete updateData.updatedAt

      const drug = await Drug.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean()

      if (!drug) {
        throw new Error('药物不存在')
      }

      logger.info('更新药物信息', { id, name: drug.name })

      return drug
    } catch (error) {
      logger.error('更新药物信息失败', {
        id,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * 删除药物
   * @param {string} id - 药物ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    try {
      if (!id) {
        throw new Error('药物ID不能为空')
      }

      const result = await Drug.findByIdAndDelete(id)

      if (!result) {
        throw new Error('药物不存在')
      }

      logger.info('删除药物', { id, name: result.name })

      return true
    } catch (error) {
      logger.error('删除药物失败', {
        id,
        error: error.message,
      })
      throw error
    }
  }
}

// 导出单例
export const drugService = new DrugService()
