import Router from '@koa/router'
import {
  getGraphData,
  getGraphStats,
  getDrugInteractionStats,
} from '../controllers/graphController.js'

const router = new Router()

/**
 * 图谱相关路由
 */

// 获取药物关系图谱数据
router.get('/drugs/graph', getGraphData)

// 获取图谱统计信息
router.get('/drugs/graph/stats', getGraphStats)

// 获取药物的相互作用统计
router.get('/drugs/:drugId/interactions/stats', getDrugInteractionStats)

export default router
