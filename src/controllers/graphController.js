import { graphService } from '../services/GraphService.js'
import { logger } from '../utils/logger.js'

/**
 * @swagger
 * tags:
 *   name: Graph
 *   description: 药物关系图谱API
 */

/**
 * @swagger
 * /api/drugs/graph:
 *   get:
 *     summary: 获取药物关系图谱数据
 *     tags: [Graph]
 *     description: 获取药物关系图谱的节点和边数据，可选择筛选特定药物及其关联
 *     parameters:
 *       - in: query
 *         name: drugId
 *         schema:
 *           type: string
 *         description: 可选的药物ID，用于筛选特定药物及其关联药物
 *     responses:
 *       200:
 *         description: 成功获取图谱数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     nodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: 节点ID（药物ID）
 *                           name:
 *                             type: string
 *                             description: 药物名称
 *                           category:
 *                             type: string
 *                             description: 药物分类
 *                           value:
 *                             type: number
 *                             description: 节点大小/重要性
 *                           description:
 *                             type: string
 *                             description: 药物描述
 *                           source:
 *                             type: string
 *                             enum: [manual, ai]
 *                             description: 数据来源
 *                     edges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           source:
 *                             type: string
 *                             description: 源节点ID
 *                           target:
 *                             type: string
 *                             description: 目标节点ID
 *                           value:
 *                             type: number
 *                             description: 边的权重
 *                           severity:
 *                             type: string
 *                             enum: [low, medium, high]
 *                             description: 相互作用严重程度
 *                           interactionType:
 *                             type: string
 *                             description: 相互作用类型
 *                           description:
 *                             type: string
 *                             description: 相互作用描述
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 指定的药物不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getGraphData = async (ctx) => {
  try {
    const { drugId } = ctx.query

    logger.info('收到获取图谱数据请求', { drugId })

    const graphData = await graphService.getGraphData(drugId || null)

    ctx.body = {
      success: true,
      data: graphData,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取图谱数据失败', {
      drugId: ctx.query.drugId,
      error: error.message,
    })

    const status = error.message.includes('不存在') ? 404 : 500

    ctx.status = status
    ctx.body = {
      success: false,
      error: {
        code: status === 404 ? 'DRUG_NOT_FOUND' : 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * @swagger
 * /api/drugs/graph/stats:
 *   get:
 *     summary: 获取图谱统计信息
 *     tags: [Graph]
 *     description: 获取药物图谱的整体统计信息，包括药物总数、相互作用总数和严重程度分布
 *     responses:
 *       200:
 *         description: 成功获取统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDrugs:
 *                       type: number
 *                       description: 药物总数
 *                     totalInteractions:
 *                       type: number
 *                       description: 相互作用总数
 *                     severityDistribution:
 *                       type: object
 *                       properties:
 *                         low:
 *                           type: number
 *                         medium:
 *                           type: number
 *                         high:
 *                           type: number
 *       500:
 *         description: 服务器内部错误
 */
export const getGraphStats = async (ctx) => {
  try {
    logger.info('收到获取图谱统计信息请求')

    const stats = await graphService.getGraphStats()

    ctx.body = {
      success: true,
      data: stats,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取图谱统计信息失败', { error: error.message })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * @swagger
 * /api/drugs/{drugId}/interactions/stats:
 *   get:
 *     summary: 获取药物的相互作用统计
 *     tags: [Graph]
 *     description: 获取指定药物的相互作用统计信息，包括总数和各严重程度的数量
 *     parameters:
 *       - in: path
 *         name: drugId
 *         required: true
 *         schema:
 *           type: string
 *         description: 药物ID
 *     responses:
 *       200:
 *         description: 成功获取统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     drugId:
 *                       type: string
 *                     drugName:
 *                       type: string
 *                     totalInteractions:
 *                       type: number
 *                     severityCounts:
 *                       type: object
 *                       properties:
 *                         high:
 *                           type: number
 *                         medium:
 *                           type: number
 *                         low:
 *                           type: number
 *                     highRiskCount:
 *                       type: number
 *                     mediumRiskCount:
 *                       type: number
 *                     lowRiskCount:
 *                       type: number
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 药物不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getDrugInteractionStats = async (ctx) => {
  try {
    const { drugId } = ctx.params

    if (!drugId) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '药物ID不能为空',
        },
        timestamp: Date.now(),
      }
      return
    }

    logger.info('收到获取药物相互作用统计请求', { drugId })

    const stats = await graphService.getDrugInteractionStats(drugId)

    ctx.body = {
      success: true,
      data: stats,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取药物相互作用统计失败', {
      drugId: ctx.params.drugId,
      error: error.message,
    })

    const status = error.message.includes('不存在') ? 404 : 500

    ctx.status = status
    ctx.body = {
      success: false,
      error: {
        code: status === 404 ? 'DRUG_NOT_FOUND' : 'INTERNAL_ERROR',
        message: error.message,
      },
      timestamp: Date.now(),
    }
  }
}
