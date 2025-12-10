import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import { connectDB } from './config/database.js'
import { config } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import router from './routes/index.js'

const app = new Koa()

// 中间件
app.use(cors())
app.use(koaBody())
app.use(errorHandler)

// 路由
app.use(router.routes())
app.use(router.allowedMethods())

// 全局错误监听
app.on('error', (err, ctx) => {
  if (ctx) {
    logger.error('应用错误:', {
      url: ctx.url,
      method: ctx.method,
      error: err.message,
    })
  }
})

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB()
    
    // 启动HTTP服务器
    app.listen(config.port, () => {
      logger.info(`服务器运行在 http://localhost:${config.port}`)
      logger.info(`环境: ${config.nodeEnv}`)
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()
