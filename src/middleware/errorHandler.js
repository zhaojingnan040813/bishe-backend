import { logger } from '../utils/logger.js'

/**
 * 统一错误处理中间件
 * 捕获所有错误并返回标准化的错误响应
 */
export const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    // 记录错误日志
    logger.error('请求错误:', {
      method: ctx.method,
      url: ctx.url,
      error: err.message,
      stack: err.stack,
    })

    // 确定HTTP状态码
    const status = err.status || err.statusCode || 500

    // 确定错误代码
    let errorCode = err.code || 'INTERNAL_ERROR'
    
    // 根据状态码设置默认错误代码
    if (status === 400) errorCode = err.code || 'BAD_REQUEST'
    if (status === 404) errorCode = err.code || 'NOT_FOUND'
    if (status === 422) errorCode = err.code || 'VALIDATION_ERROR'
    if (status === 503) errorCode = err.code || 'SERVICE_UNAVAILABLE'
    if (status === 504) errorCode = err.code || 'GATEWAY_TIMEOUT'

    // 设置响应
    ctx.status = status
    ctx.body = {
      success: false,
      error: {
        code: errorCode,
        message: err.message || '服务器内部错误',
      },
      timestamp: Date.now(),
    }

    // 触发Koa的错误事件
    ctx.app.emit('error', err, ctx)
  }
}
