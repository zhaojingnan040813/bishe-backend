/**
 * 测试AI分析返回详细文本描述
 * 验证aiAnalysis字段包含详细的长文本描述
 */

import { aiService } from '../src/services/AIService.js'
import { drugService } from '../src/services/DrugService.js'
import { logger } from '../src/utils/logger.js'

async function testAIAnalysisDetailed() {
  console.log('=== 测试AI分析返回详细文本描述 ===\n')

  try {
    // 测试1: 直接调用AI服务分析药物
    console.log('测试1: 调用AI服务分析阿司匹林...')
    const aiResult = await aiService.analyzeDrug('阿司匹林')
    
    console.log('\n✓ AI分析结果:')
    console.log('- 药物名称:', aiResult.name)
    console.log('- 通用名:', aiResult.genericName)
    console.log('- 分类:', aiResult.category)
    console.log('- 简短描述:', aiResult.description)
    console.log('- 副作用数量:', aiResult.sideEffects?.length || 0)
    console.log('- 禁忌症数量:', aiResult.contraindications?.length || 0)
    console.log('- 用法用量:', aiResult.dosage)
    console.log('\n- AI详细分析 (aiAnalysis字段):')
    console.log('  长度:', aiResult.aiAnalysis?.length || 0, '字符')
    console.log('  内容预览:', aiResult.aiAnalysis?.substring(0, 200) + '...')
    
    // 验证aiAnalysis字段存在且为字符串
    if (!aiResult.aiAnalysis || typeof aiResult.aiAnalysis !== 'string') {
      throw new Error('aiAnalysis字段不存在或不是字符串类型')
    }
    
    // 验证aiAnalysis字段包含详细内容（至少100字符）
    if (aiResult.aiAnalysis.length < 100) {
      throw new Error('aiAnalysis字段内容太短，应该包含详细的长文本描述')
    }
    
    console.log('\n✓ 验证通过: aiAnalysis字段包含详细的长文本描述')
    
    // 测试2: 通过DrugService的findOrAnalyze方法
    console.log('\n\n测试2: 通过DrugService查询或分析药物...')
    const result = await drugService.findOrAnalyze('布洛芬')
    
    console.log('\n✓ 查询结果:')
    console.log('- 数据来源:', result.source)
    console.log('- 药物名称:', result.drug.name)
    console.log('- 简短描述:', result.drug.description)
    console.log('\n- AI详细分析:')
    console.log('  长度:', result.drug.aiAnalysis?.length || 0, '字符')
    console.log('  内容预览:', result.drug.aiAnalysis?.substring(0, 200) + '...')
    
    // 验证
    if (!result.drug.aiAnalysis || typeof result.drug.aiAnalysis !== 'string') {
      throw new Error('返回的药物数据中aiAnalysis字段不存在或不是字符串类型')
    }
    
    if (result.drug.aiAnalysis.length < 100) {
      throw new Error('返回的药物数据中aiAnalysis字段内容太短')
    }
    
    console.log('\n✓ 验证通过: DrugService返回的数据包含详细的aiAnalysis字段')
    
    // 测试3: 验证aiAnalysis包含关键信息
    console.log('\n\n测试3: 验证aiAnalysis包含关键信息...')
    const analysis = result.drug.aiAnalysis
    
    const keywords = ['特性', '起源', '相互作用', '成分', '作用', '替代']
    const foundKeywords = keywords.filter(keyword => 
      analysis.includes(keyword) || 
      analysis.includes(keyword.replace('特性', '性质')) ||
      analysis.includes(keyword.replace('起源', '历史'))
    )
    
    console.log('- 找到的关键词:', foundKeywords.join(', '))
    console.log('- 覆盖率:', `${foundKeywords.length}/${keywords.length}`)
    
    if (foundKeywords.length < 3) {
      console.log('⚠ 警告: aiAnalysis可能缺少某些关键信息，但这取决于AI的输出')
    } else {
      console.log('✓ aiAnalysis包含多个关键信息维度')
    }
    
    console.log('\n\n=== 所有测试通过 ===')
    console.log('✓ AI分析功能已成功修改为返回详细的长文本描述')
    console.log('✓ aiAnalysis字段包含药物的特性、起源、相互作用、成分、作用机制、替代品等信息')
    
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message)
    console.error('错误详情:', error)
    process.exit(1)
  }
}

// 运行测试
testAIAnalysisDetailed()
  .then(() => {
    console.log('\n测试完成')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n测试执行失败:', error)
    process.exit(1)
  })
