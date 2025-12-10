import Router from '@koa/router'

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

// 这里将添加其他路由模块
// import drugRoutes from './drug.js'
// import interactionRoutes from './interaction.js'
// apiRouter.use(drugRoutes.routes())
// apiRouter.use(interactionRoutes.routes())

router.use(apiRouter.routes())

export default router
