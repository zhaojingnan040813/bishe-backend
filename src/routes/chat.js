import Router from '@koa/router'
import { streamChat } from '../controllers/chatController.js'

const router = new Router()

// AI聊天路由
router.post('/ai/chat/stream', streamChat)

export default router
