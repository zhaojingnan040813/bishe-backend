/**
 * 手动测试脚本 - 测试AIService功能
 * 运行: node test-ai-service.js
 */

import { aiService } from '../src/services/AIService.js'
import { logger } from '../src/utils/logger.js'

async function testAIService() {
  console.log('=== 开始测试AIService ===\n')

  try {
    // 测试1: 分析单个药物
    console.log('测试1: 分析单个药物 (阿司匹林)')
    const drugAnalysis = await aiService.analyzeDrug('阿司匹林')
    console.log('✓ 药物分析成功')
    console.log('结果:', JSON.stringify(drugAnalysis, null, 2))
    console.log('\n')

    // 验证返回数据结构
    if (!drugAnalysis.name || !drugAnalysis.category || !drugAnalysis.description) {
      console.error('✗ 返回数据缺少必需字段')
      process.exit(1)
    }
    console.log('✓ 数据结构验证通过\n')

    // 测试2: 分析药物相互作用
    console.log('测试2: 分析药物相互作用 (阿司匹林 + 华法林)')
    const interactionAnalysis = await aiService.analyzeInteractions(['阿司匹林', '华法林'])
    console.log('✓ 相互作用分析成功')
    console.log('结果:', JSON.stringify(interactionAnalysis, null, 2))
    console.log('\n')

    // 验证返回数据结构
    if (!interactionAnalysis.interactions || !Array.isArray(interactionAnalysis.interactions)) {
      console.error('✗ 返回数据缺少interactions数组')
      process.exit(1)
    }
    console.log('✓ 数据结构验证通过\n')

    // 测试3: 健康检查
    console.log('测试3: AI服务健康检查')
    const isHealthy = await aiService.healthCheck()
    console.log(`✓ 健康检查结果: ${isHealthy ? '正常' : '异常'}\n`)

    console.log('=== 所有测试通过 ===')
    process.exit(0)
  } catch (error) {
    console.error('✗ 测试失败:', error.message)
    console.error('错误代码:', error.code)
    console.error('错误详情:', error.stack)
    process.exit(1)
  }
}

// 运行测试
testAIService()

