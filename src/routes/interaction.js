import Router from '@koa/router'
import {
  checkInteractions,
  getInteractionById,
} from '../controllers/interactionController.js'

const router = new Router()

// 相互作用相关路由
router.post('/interactions/check', checkInteractions)
router.get('/interactions/:id', getInteractionById)

export default router
