import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import { koaSwagger } from 'koa2-swagger-ui'
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

// Swagger UI
app.use(
  koaSwagger({
    routePrefix: '/swagger',
    swaggerOptions: {
      url: '/swagger.json',
    },
  })
)

// Swagger JSON endpoint
router.get('/swagger.json', (ctx) => {
  ctx.body = {
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
    paths: {
      '/api/drugs': {
        get: {
          tags: ['Drugs'],
          summary: '获取药物列表',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: '页码',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 10 },
              description: '每页数量',
            },
          ],
          responses: {
            200: { description: '成功返回药物列表' },
            500: { description: '服务器错误' },
          },
        },
      },
      '/api/drugs/search': {
        get: {
          tags: ['Drugs'],
          summary: '搜索药物',
          parameters: [
            {
              name: 'name',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: '搜索关键词',
            },
          ],
          responses: {
            200: { description: '成功返回搜索结果' },
            400: { description: '请求参数错误' },
            500: { description: '服务器错误' },
          },
        },
      },
      '/api/drugs/{id}': {
        get: {
          tags: ['Drugs'],
          summary: '获取药物详情',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: '药物ID',
            },
          ],
          responses: {
            200: { description: '成功返回药物详情' },
            404: { description: '药物不存在' },
            500: { description: '服务器错误' },
          },
        },
      },
      '/api/drugs/analyze': {
        post: {
          tags: ['Drugs'],
          summary: 'AI分析药物',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                      description: '药物名称',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: '成功返回药物分析结果' },
            400: { description: '请求参数错误' },
            502: { description: 'AI接口调用失败' },
            500: { description: '服务器错误' },
          },
        },
      },
      '/api/drugs/graph': {
        get: {
          tags: ['Graph'],
          summary: '获取药物关系图谱数据',
          description: '获取药物关系图谱的节点和边数据，可选择筛选特定药物及其关联',
          parameters: [
            {
              name: 'drugId',
              in: 'query',
              schema: { type: 'string' },
              description: '可选的药物ID，用于筛选特定药物及其关联药物',
            },
          ],
          responses: {
            200: { description: '成功获取图谱数据' },
            404: { description: '指定的药物不存在' },
            500: { description: '服务器内部错误' },
          },
        },
      },
      '/api/drugs/graph/stats': {
        get: {
          tags: ['Graph'],
          summary: '获取图谱统计信息',
          description: '获取药物图谱的整体统计信息，包括药物总数、相互作用总数和严重程度分布',
          responses: {
            200: { description: '成功获取统计信息' },
            500: { description: '服务器内部错误' },
          },
        },
      },
      '/api/drugs/{drugId}/interactions/stats': {
        get: {
          tags: ['Graph'],
          summary: '获取药物的相互作用统计',
          description: '获取指定药物的相互作用统计信息，包括总数和各严重程度的数量',
          parameters: [
            {
              name: 'drugId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: '药物ID',
            },
          ],
          responses: {
            200: { description: '成功获取统计信息' },
            400: { description: '请求参数错误' },
            404: { description: '药物不存在' },
            500: { description: '服务器内部错误' },
          },
        },
      },
      '/api/interactions/check': {
        post: {
          tags: ['Interactions'],
          summary: '检测药物相互作用',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['drugIds'],
                  properties: {
                    drugIds: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '药物ID数组（至少2个）',
                      example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: '成功返回检测结果' },
            400: { description: '请求参数错误' },
            502: { description: 'AI接口调用失败' },
            500: { description: '服务器错误' },
          },
        },
      },
      '/api/interactions/{id}': {
        get: {
          tags: ['Interactions'],
          summary: '获取相互作用详情',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: '相互作用ID',
            },
          ],
          responses: {
            200: { description: '成功返回相互作用详情' },
            404: { description: '相互作用不存在' },
            500: { description: '服务器错误' },
          },
        },
      },
    },
  }
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
      logger.info(`环境: ${config.nodeEnv}`)
    })
  } catch (error) {
    logger.error('服务器启动失败:', error)
    process.exit(1)
  }
}

startServer()
