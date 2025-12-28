import { aiService } from '../services/AIService.js'
import { logger } from '../utils/logger.js'

/**
 * 聊天控制器
 * 处理AI聊天相关的HTTP请求
 */

/**
 * @swagger
 * /api/ai/chat/stream:
 *   post:
 *     summary: 流式AI聊天对话
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户消息
 *                 example: "头孢和酒精在一起服用会有哪些副作用？"
 *               history:
 *                 type: array
 *                 description: 对话历史（可选）
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: 成功返回流式响应
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: SSE流式数据
 *       400:
 *         description: 请求参数错误
 *       502:
 *         description: AI服务连接失败
 *       504:
 *         description: AI服务超时
 *       500:
 *         description: 服务器错误
 */
export const streamChat = async (ctx) => {
    try {
        const { message, history = [] } = ctx.request.body

        // 参数验证：消息不能为空
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            ctx.status = 400
            ctx.body = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETER',
                    message: '消息内容不能为空',
                },
                timestamp: Date.now(),
            }
            return
        }

        // 验证history格式（如果提供）
        if (history && !Array.isArray(history)) {
            ctx.status = 400
            ctx.body = {
                success: false,
                error: {
                    code: 'INVALID_PARAMETER',
                    message: 'history必须是数组',
                },
                timestamp: Date.now(),
            }
            return
        }

        // 设置SSE响应头
        ctx.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // 禁用nginx缓冲
        })

        ctx.status = 200

        // 创建可写流
        const stream = ctx.res

        // 发送开始事件
        stream.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`)

        try {
            // 获取AI流式响应
            const aiStream = aiService.streamChat(message, history)

            // 逐块发送内容
            for await (const content of aiStream) {
                const data = JSON.stringify({
                    type: 'content',
                    text: content,
                })
                stream.write(`data: ${data}\n\n`)
            }

            // 发送完成事件
            stream.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
            stream.end()

            logger.info('流式聊天完成', {
                timestamp: new Date().toISOString(),
                message: message.substring(0, 50), // 只记录前50个字符
                historyLength: history.length,
            })

        } catch (streamError) {
            // 流式传输过程中的错误
            logger.error('流式传输错误', {
                timestamp: new Date().toISOString(),
                error: streamError.message,
                stack: streamError.stack,
            })

            // 发送错误事件
            const errorData = JSON.stringify({
                type: 'error',
                error: streamError.message || 'AI服务异常',
            })
            stream.write(`data: ${errorData}\n\n`)
            stream.end()
        }

    } catch (error) {
        logger.error('流式聊天请求处理失败', {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
        })

        // 如果响应头已发送，无法再设置状态码
        if (ctx.headerSent) {
            // 通过SSE发送错误
            const errorData = JSON.stringify({
                type: 'error',
                error: error.message || '服务器内部错误',
            })
            ctx.res.write(`data: ${errorData}\n\n`)
            ctx.res.end()
        } else {
            // 返回JSON错误响应
            // 根据错误类型设置不同的状态码
            if (error.code === 'AI_CONNECTION_ERROR') {
                ctx.status = 502
                ctx.body = {
                    success: false,
                    error: {
                        code: 'AI_CONNECTION_ERROR',
                        message: '无法连接到AI服务，请检查网络连接',
                    },
                    timestamp: Date.now(),
                }
            } else if (error.code === 'AI_TIMEOUT') {
                ctx.status = 504
                ctx.body = {
                    success: false,
                    error: {
                        code: 'AI_TIMEOUT',
                        message: 'AI接口调用超时，请稍后重试',
                    },
                    timestamp: Date.now(),
                }
            } else {
                ctx.status = 500
                ctx.body = {
                    success: false,
                    error: {
                        code: 'STREAM_CHAT_ERROR',
                        message: error.message || '流式聊天失败',
                    },
                    timestamp: Date.now(),
                }
            }
        }
    }
}
