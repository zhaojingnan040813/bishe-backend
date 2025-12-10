import { interactionService } from '../services/InteractionService.js'
import { logger } from '../utils/logger.js'

/**
 * 相互作用控制器
 * 处理药物相互作用相关的HTTP请求
 */

/**
 * @swagger
 * /api/interactions/check:
 *   post:
 *     summary: 检测药物相互作用
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drugIds
 *             properties:
 *               drugIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 药物ID数组（至少2个）
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: 成功返回检测结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     interactions:
 *                       type: array
 *                       description: 相互作用列表
 *                     riskLevel:
 *                       type: string
 *                       enum: [low, medium, high]
 *                       description: 整体风险等级
 *                     source:
 *                       type: string
 *                       enum: [database, ai, mixed]
 *                       description: 数据来源
 *                     drugCount:
 *                       type: integer
 *                       description: 药物数量
 *                     interactionCount:
 *                       type: integer
 *                       description: 相互作用数量
 *       400:
 *         description: 请求参数错误
 *       502:
 *         description: AI接口调用失败
 *       500:
 *         description: 服务器错误
 */
export const checkInteractions = async (ctx) => {
  try {
    const { drugIds } = ctx.request.body

    // 参数验证
    if (!drugIds) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '缺少必需参数: drugIds',
        },
        timestamp: Date.now(),
      }
      return
    }

    if (!Array.isArray(drugIds)) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: 'drugIds 必须是数组',
        },
        timestamp: Date.now(),
      }
      return
    }

    if (drugIds.length < 2) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '至少需要2个药物ID进行相互作用检测',
        },
        timestamp: Date.now(),
      }
      return
    }

    // 验证每个drugId都是字符串
    const invalidIds = drugIds.filter(id => typeof id !== 'string' || id.trim().length === 0)
    if (invalidIds.length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '所有药物ID必须是非空字符串',
        },
        timestamp: Date.now(),
      }
      return
    }

    // 调用服务层检测相互作用
    const result = await interactionService.checkInteractions(drugIds)

    ctx.body = {
      success: true,
      data: result,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('检测药物相互作用失败', { error: error.message })

    // 判断错误类型
    if (error.message.includes('不存在')) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: {
          code: 'DRUG_NOT_FOUND',
          message: error.message,
        },
        timestamp: Date.now(),
      }
    } else if (error.message.includes('AI') || error.message.includes('接口')) {
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
          code: 'CHECK_INTERACTIONS_ERROR',
          message: error.message || '检测药物相互作用失败',
        },
        timestamp: Date.now(),
      }
    }
  }
}

/**
 * @swagger
 * /api/interactions/{id}:
 *   get:
 *     summary: 获取相互作用详情
 *     tags: [Interactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 相互作用ID
 *     responses:
 *       200:
 *         description: 成功返回相互作用详情
 *       404:
 *         description: 相互作用不存在
 *       500:
 *         description: 服务器错误
 */
export const getInteractionById = async (ctx) => {
  try {
    const { id } = ctx.params

    if (!id) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: '相互作用ID不能为空',
        },
        timestamp: Date.now(),
      }
      return
    }

    const Interaction = (await import('../models/Interaction.js')).default
    const interaction = await Interaction.findById(id).lean()

    if (!interaction) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: {
          code: 'INTERACTION_NOT_FOUND',
          message: '相互作用不存在',
        },
        timestamp: Date.now(),
      }
      return
    }

    ctx.body = {
      success: true,
      data: interaction,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error('获取相互作用详情失败', { error: error.message })
    ctx.status = 500
    ctx.body = {
      success: false,
      error: {
        code: 'GET_INTERACTION_ERROR',
        message: error.message || '获取相互作用详情失败',
      },
      timestamp: Date.now(),
    }
  }
}
