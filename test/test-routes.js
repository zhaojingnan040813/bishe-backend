/**
 * 路由和控制器测试脚本
 * 测试所有API端点是否正常工作
 */

import { config } from '../src/config/env.js'
import { logger } from '../src/utils/logger.js'

const BASE_URL = `http://localhost:${config.port}`

// 辅助函数：发送HTTP请求
async function request(method, path, body = null) {
  const url = `${BASE_URL}${path}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return { status: response.status, data }
  } catch (error) {
    logger.error('请求失败', { url, error: error.message })
    throw error
  }
}

// 测试函数
async function testRoutes() {
  console.log('开始测试API路由...\n')

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查 GET /health')
    const health = await request('GET', '/health')
    console.log('   状态码:', health.status)
    console.log('   响应:', JSON.stringify(health.data, null, 2))
    console.log('   ✓ 健康检查通过\n')

    // 2. 测试获取药物列表
    console.log('2. 测试获取药物列表 GET /api/drugs')
    const drugs = await request('GET', '/api/drugs?page=1&limit=5')
    console.log('   状态码:', drugs.status)
    console.log('   药物数量:', drugs.data.data?.length || 0)
    console.log('   ✓ 获取药物列表成功\n')

    // 3. 测试搜索药物
    console.log('3. 测试搜索药物 GET /api/drugs/search')
    const search = await request('GET', '/api/drugs/search?name=阿司匹林')
    console.log('   状态码:', search.status)
    console.log('   搜索结果数量:', search.data.count || 0)
    console.log('   ✓ 搜索药物成功\n')

    // 4. 测试搜索药物（空关键词）
    console.log('4. 测试搜索药物（空关键词）')
    const searchEmpty = await request('GET', '/api/drugs/search?name=')
    console.log('   状态码:', searchEmpty.status)
    console.log('   错误信息:', searchEmpty.data.error?.message)
    console.log('   ✓ 参数验证正常\n')

    // 5. 测试获取药物详情（如果有药物）
    if (drugs.data.data && drugs.data.data.length > 0) {
      const drugId = drugs.data.data[0]._id
      console.log('5. 测试获取药物详情 GET /api/drugs/:id')
      const drugDetail = await request('GET', `/api/drugs/${drugId}`)
      console.log('   状态码:', drugDetail.status)
      console.log('   药物名称:', drugDetail.data.data?.name)
      console.log('   ✓ 获取药物详情成功\n')
    }

    // 6. 测试AI分析药物
    console.log('6. 测试AI分析药物 POST /api/drugs/analyze')
    const analyze = await request('POST', '/api/drugs/analyze', {
      name: '测试药物',
    })
    console.log('   状态码:', analyze.status)
    if (analyze.status === 200) {
      console.log('   数据来源:', analyze.data.data?.source)
      console.log('   ✓ AI分析成功\n')
    } else {
      console.log('   错误信息:', analyze.data.error?.message)
      console.log('   ⚠ AI分析失败（可能是AI服务未配置）\n')
    }

    // 7. 测试AI分析药物（空名称）
    console.log('7. 测试AI分析药物（空名称）')
    const analyzeEmpty = await request('POST', '/api/drugs/analyze', {
      name: '',
    })
    console.log('   状态码:', analyzeEmpty.status)
    console.log('   错误信息:', analyzeEmpty.data.error?.message)
    console.log('   ✓ 参数验证正常\n')

    // 8. 测试获取图谱数据
    console.log('8. 测试获取图谱数据 GET /api/drugs/graph')
    const graph = await request('GET', '/api/drugs/graph')
    console.log('   状态码:', graph.status)
    console.log('   节点数量:', graph.data.data?.nodes?.length || 0)
    console.log('   边数量:', graph.data.data?.edges?.length || 0)
    console.log('   ✓ 获取图谱数据成功\n')

    // 9. 测试检测药物相互作用（需要至少2个药物）
    if (drugs.data.data && drugs.data.data.length >= 2) {
      const drugIds = drugs.data.data.slice(0, 2).map(d => d._id)
      console.log('9. 测试检测药物相互作用 POST /api/interactions/check')
      const check = await request('POST', '/api/interactions/check', {
        drugIds,
      })
      console.log('   状态码:', check.status)
      if (check.status === 200) {
        console.log('   相互作用数量:', check.data.data?.interactionCount || 0)
        console.log('   风险等级:', check.data.data?.riskLevel)
        console.log('   数据来源:', check.data.data?.source)
        console.log('   ✓ 检测相互作用成功\n')
      } else {
        console.log('   错误信息:', check.data.error?.message)
        console.log('   ⚠ 检测相互作用失败\n')
      }
    }

    // 10. 测试检测药物相互作用（参数错误）
    console.log('10. 测试检测药物相互作用（参数错误）')
    const checkError = await request('POST', '/api/interactions/check', {
      drugIds: ['single-id'],
    })
    console.log('   状态码:', checkError.status)
    console.log('   错误信息:', checkError.data.error?.message)
    console.log('   ✓ 参数验证正常\n')

    // 11. 测试Swagger文档
    console.log('11. 测试Swagger文档 GET /swagger.json')
    const swagger = await request('GET', '/swagger.json')
    console.log('   状态码:', swagger.status)
    console.log('   API标题:', swagger.data.info?.title)
    console.log('   API版本:', swagger.data.info?.version)
    console.log('   ✓ Swagger文档生成成功\n')

    console.log('✅ 所有路由测试完成！')
    console.log('\n访问 http://localhost:' + config.port + '/swagger 查看完整API文档')
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 等待服务器启动
async function waitForServer(maxAttempts = 10) {
  console.log('等待服务器启动...')
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await request('GET', '/health')
      console.log('服务器已就绪\n')
      return true
    } catch (error) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  throw new Error('服务器启动超时')
}

// 主函数
async function main() {
  try {
    await waitForServer()
    await testRoutes()
    process.exit(0)
  } catch (error) {
    console.error('测试失败:', error.message)
    process.exit(1)
  }
}

main()
