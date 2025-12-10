/**
 * 图谱服务测试脚本
 * 测试GraphService的各项功能
 */

import { connectDB } from '../src/config/database.js'
import { graphService } from '../src/services/GraphService.js'
import Drug from '../src/models/Drug.js'
import { logger } from '../src/utils/logger.js'

async function testGraphService() {
  console.log('开始测试图谱服务...\n')

  try {
    // 连接数据库
    await connectDB()
    console.log('✓ 数据库连接成功\n')

    // 1. 测试获取所有图谱数据
    console.log('1. 测试获取所有图谱数据')
    const allGraphData = await graphService.getGraphData()
    console.log('   节点数量:', allGraphData.nodes.length)
    console.log('   边数量:', allGraphData.edges.length)
    if (allGraphData.nodes.length > 0) {
      console.log('   示例节点:', JSON.stringify(allGraphData.nodes[0], null, 2))
    }
    if (allGraphData.edges.length > 0) {
      console.log('   示例边:', JSON.stringify(allGraphData.edges[0], null, 2))
    }
    console.log('   ✓ 获取所有图谱数据成功\n')

    // 2. 测试获取筛选后的图谱数据
    const drugs = await Drug.find().limit(1).lean()
    if (drugs.length > 0) {
      const drugId = drugs[0]._id.toString()
      console.log('2. 测试获取筛选后的图谱数据')
      console.log('   目标药物:', drugs[0].name)
      const filteredGraphData = await graphService.getGraphData(drugId)
      console.log('   节点数量:', filteredGraphData.nodes.length)
      console.log('   边数量:', filteredGraphData.edges.length)
      console.log('   ✓ 获取筛选图谱数据成功\n')

      // 3. 测试获取药物相互作用统计
      console.log('3. 测试获取药物相互作用统计')
      const stats = await graphService.getDrugInteractionStats(drugId)
      console.log('   药物名称:', stats.drugName)
      console.log('   总相互作用数:', stats.totalInteractions)
      console.log('   高风险数:', stats.highRiskCount)
      console.log('   中风险数:', stats.mediumRiskCount)
      console.log('   低风险数:', stats.lowRiskCount)
      console.log('   ✓ 获取药物统计成功\n')
    } else {
      console.log('2-3. ⚠ 数据库中没有药物，跳过筛选和统计测试\n')
    }

    // 4. 测试获取图谱统计信息
    console.log('4. 测试获取图谱统计信息')
    const graphStats = await graphService.getGraphStats()
    console.log('   药物总数:', graphStats.totalDrugs)
    console.log('   相互作用总数:', graphStats.totalInteractions)
    console.log('   严重程度分布:', JSON.stringify(graphStats.severityDistribution, null, 2))
    console.log('   ✓ 获取图谱统计成功\n')

    // 5. 测试节点值计算
    console.log('5. 测试节点值计算')
    const testDrug = {
      _id: '507f1f77bcf86cd799439011',
      name: '测试药物',
      category: '测试分类',
      source: 'manual',
      sideEffects: ['副作用1', '副作用2', '副作用3'],
    }
    const nodeValue = graphService.calculateNodeValue(testDrug)
    console.log('   测试药物:', testDrug.name)
    console.log('   副作用数量:', testDrug.sideEffects.length)
    console.log('   计算的节点值:', nodeValue)
    console.log('   ✓ 节点值计算成功\n')

    // 6. 测试边权重计算
    console.log('6. 测试边权重计算')
    const severities = ['low', 'medium', 'high']
    for (const severity of severities) {
      const edgeValue = graphService.calculateEdgeValue(severity)
      console.log(`   ${severity} 严重程度的边权重:`, edgeValue)
    }
    console.log('   ✓ 边权重计算成功\n')

    // 7. 测试错误处理 - 不存在的药物ID
    console.log('7. 测试错误处理 - 不存在的药物ID')
    try {
      await graphService.getGraphData('000000000000000000000000')
      console.log('   ✗ 应该抛出错误但没有\n')
    } catch (error) {
      console.log('   错误信息:', error.message)
      console.log('   ✓ 错误处理正常\n')
    }

    console.log('✅ 所有图谱服务测试完成！')
    process.exit(0)
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testGraphService()
