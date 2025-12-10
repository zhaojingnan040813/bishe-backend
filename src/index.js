import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import dotenv from 'dotenv'
import { connectDB } from './config/database.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import router from './routes/index.js'

dotenv.config()

const app = new Koa()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(koaBody())
app.use(errorHandler)

// 路由
app.use(router.routes())
app.use(router.allowedMethods())

// 启动服务器
const startServer = async () => {
  try {
    await connectDB()
    app.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`)
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()
