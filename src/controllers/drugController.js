import { drugService } from '../services/DrugService.js'
import { logger } from '../utils/logger.js'

/**
 * 药物控制器
 * 处理药物相关的HTTP请求
 */

/**
 * @swagger
 * /api/drugs:
 *   get:
 *     summary: 获取药物列表
 *     tags: [Drugs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功返回药物列表
 *       500:
 *         description: 服务器错误
 */
export const getDrugs = async (ctx) => {
  try {
    const { page = 1, limit = 10 } = ctx.query

    const result = await drugService.findAll(page, limit)

    ctx.body = {
      success: true,
      data: result.drugs,
      pagination: {
        page: result.page,
        limit: parseInt(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取药物列表失败', { error: error.message })
    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'GET_DRUGS_ERROR',
        message: error.message || '获取药物列表失败',
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * @swagger
 * /api/drugs/search:
 *   get:
 *     summary: 搜索药物
 *     tags: [Drugs]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功返回搜索结果
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const searchDrugs = async (ctx) => {
  try {
    const { name } = ctx.query

    // 参数验证
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '搜索关键词不能为空',
        },
        timestamp: Date.now(),
      }
      return
    }

    const drugs = await drugService.search(name)

    ctx.body = {
      success: true,
      data: drugs,
      count: drugs.length,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('搜索药物失败', { error: error.message })
    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'SEARCH_DRUGS_ERROR',
        message: error.message || '搜索药物失败',
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * @swagger
 * /api/drugs/{id}:
 *   get:
 *     summary: 获取药物详情
 *     tags: [Drugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 药物ID
 *     responses:
 *       200:
 *         description: 成功返回药物详情
 *       404:
 *         description: 药物不存在
 *       500:
 *         description: 服务器错误
 */
export const getDrugById = async (ctx) => {
  try {
    const { id } = ctx.params

    // 参数验证
    if (!id) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '药物ID不能为空',
        },
        timestamp: Date.now(),
      }
      return
    }

    const drug = await drugService.findById(id)

    if (!drug) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: {
          code: 'DRUG_NOT_FOUND',
          message: '药物不存在',
        },
        timestamp: Date.now(),
      }
      return
    }

    ctx.body = {
      success: true,
      data: drug,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取药物详情失败', { error: error.message })
    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'GET_DRUG_ERROR',
        message: error.message || '获取药物详情失败',
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * @swagger
 * /api/drugs/analyze:
 *   post:
 *     summary: AI分析药物
 *     tags: [Drugs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 药物名称
 *     responses:
 *       200:
 *         description: 成功返回药物分析结果
 *       400:
 *         description: 请求参数错误
 *       502:
 *         description: AI接口调用失败
 *       500:
 *         description: 服务器错误
 */
export const analyzeDrug = async (ctx) => {
  try {
    const { name } = ctx.request.body

    // 参数验证
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '药物名称不能为空',
        },
        timestamp: Date.now(),
      }
      return
    }

    // 调用服务层的findOrAnalyze方法（实现缓存优先策略）
    const result = await drugService.findOrAnalyze(name)

    ctx.body = {
      success: true,
      data: {
        ...result.drug,
        source: result.source, // 标识数据来源：database 或 ai
      },
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('分析药物失败', { error: error.message })

    // 判断是否为AI接口错误
    if (error.message.includes('AI') || error.message.includes('接口')) {
      ctx.status = 502
      ctx.body = {
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'AI接口调用失败，请稍后重试',
        },
        timestamp: Date.now(),
      }
    } else {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: 'ANALYZE_DRUG_ERROR',
          message: error.message || '分析药物失败',
        },
        timestamp: Date.now(),
      }
    }
  }
}

/**
 * @swagger
 * /api/drugs/graph:
 *   get:
 *     summary: 获取药物关系图谱数据
 *     tags: [Drugs]
 *     parameters:
 *       - in: query
 *         name: drugId
 *         schema:
 *           type: string
 *         description: 可选的药物ID，用于筛选特定药物的关系
 *     responses:
 *       200:
 *         description: 成功返回图谱数据
 *       500:
 *         description: 服务器错误
 */
export const getGraphData = async (ctx) => {
  try {
    const { drugId } = ctx.query

    // 这里暂时返回基础实现
    // 完整的图谱服务将在任务8中实现
    const Drug = (await import('../models/Drug.js')).default
    const Interaction = (await import('../models/Interaction.js')).default

    // 获取所有药物作为节点
    let drugs
    if (drugId) {
      // 如果指定了drugId，获取该药物及其相关药物
      const targetDrug = await Drug.findById(drugId).lean()
      if (!targetDrug) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: 'DRUG_NOT_FOUND',
            message: '指定的药物不存在',
          },
          timestamp: Date.now(),
        }
        return
      }

      // 获取与该药物相关的所有相互作用
      const interactions = await Interaction.findByDrugId(drugId)
      const relatedDrugIds = new Set([drugId])

      interactions.forEach(interaction => {
        relatedDrugIds.add(interaction.drug1Id.toString())
        relatedDrugIds.add(interaction.drug2Id.toString())
      })

      drugs = await Drug.find({
        _id: { $in: Array.from(relatedDrugIds) },
      }).lean()
    } else {
      // 获取所有药物
      drugs = await Drug.find().limit(50).lean()
    }

    // 构建节点数据
    const nodes = drugs.map(drug => ({
      id: drug._id.toString(),
      name: drug.name,
      category: drug.category,
      value: 10, // 默认节点大小
    }))

    // 获取相互作用作为边
    const drugIds = drugs.map(d => d._id)
    const interactions = await Interaction.find({
      drug1Id: { $in: drugIds },
      drug2Id: { $in: drugIds },
    }).lean()

    // 构建边数据
    const edges = interactions.map(interaction => ({
      source: interaction.drug1Id.toString(),
      target: interaction.drug2Id.toString(),
      value: interaction.severity === 'high' ? 3 : interaction.severity === 'medium' ? 2 : 1,
      severity: interaction.severity,
    }))

    ctx.body = {
      success: true,
      data: {
        nodes,
        edges,
      },
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取图谱数据失败', { error: error.message })
    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'GET_GRAPH_ERROR',
        message: error.message || '获取图谱数据失败',
      },
      timestamp: Date.now(),
    }
  }
}
