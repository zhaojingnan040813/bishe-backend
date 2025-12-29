import Router from '@koa/router'
import drugRoutes from './drug.js'
import interactionRoutes from './interaction.js'
import graphRoutes from './graph.js'
import chatRoutes from './chat.js'

const router = new Router()

// 健康检查路由
router.get('/health', (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
    },
  }
})

// API路由前缀
const apiRouter = new Router({ prefix: '/api' })

// 注册路由模块
// 注意：graphRoutes 必须在 drugRoutes 之前注册
// 因为 /drugs/graph 需要在 /drugs/:id 之前匹配
apiRouter.use(graphRoutes.routes())
apiRouter.use(drugRoutes.routes())
apiRouter.use(interactionRoutes.routes())
apiRouter.use(chatRoutes.routes())

router.use(apiRouter.routes())

export default router
