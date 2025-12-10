import Router from '@koa/router'
import {
  getDrugs,
  searchDrugs,
  getDrugById,
  analyzeDrug,
} from '../controllers/drugController.js'

const router = new Router()

// 药物相关路由
// 注意：搜索路由必须在 :id 路由之前，否则 'search' 会被当作 id
router.get('/drugs/search', searchDrugs)
router.get('/drugs/:id', getDrugById)
router.get('/drugs', getDrugs)
router.post('/drugs/analyze', analyzeDrug)

export default router
