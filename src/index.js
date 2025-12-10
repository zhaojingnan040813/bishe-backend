import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import { koaSwagger } from 'koa2-swagger-ui'
import swaggerJsdoc from 'swagger-jsdoc'
import { connectDB } from './config/database.js'
import { config } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import router from './routes/index.js'

const app = new Koa()

// Swagger JSDoc 配置 - 从控制器注释自动生成文档
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '药物相互作用查询系统 API',
      description: 'API文档 - 药物相互作用查询系统后端接口',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: '开发环境',
      },
    ],
    tags: [
      {
        name: 'Drugs',
        description: '药物相关接口',
      },
      {
        name: 'Interactions',
        description: '药物相互作用相关接口',
      },
      {
        name: 'Graph',
        description: '药物关系图谱接口',
      },
    ],
  },
  // 扫描控制器文件中的 @swagger 注释
  apis: ['./src/controllers/*.js'],
}

// 生成 Swagger 规范
const swaggerSpec = swaggerJsdoc(swaggerOptions)

// 中间件
app.use(cors())
app.use(koaBody())
app.use(errorHandler)

// Swagger UI
app.use(
  koaSwagger({
    routePrefix: '/swagger',
    swaggerOptions: {
      url: '/swagger.json',
    },
  })
)

// Swagger JSON endpoint - 返回自动生成的文档
router.get('/swagger.json', (ctx) => {
  ctx.body = swaggerSpec
})

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
      logger.info(`Swagger UI: http://localhost:${config.port}/swagger`)
      logger.info(`Swagger JSON: http://localhost:${config.port}/swagger.json`)
      logger.info(`环境: ${config.nodeEnv}`)
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()
