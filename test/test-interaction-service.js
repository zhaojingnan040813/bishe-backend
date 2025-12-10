/**
 * InteractionService 手动测试脚本
 * 测试相互作用服务的核心功能
 */

import mongoose from 'mongoose'
import { config } from '../src/config/env.js'
import { interactionService } from '../src/services/InteractionService.js'
import Drug from '../src/models/Drug.js'
import Interaction from '../src/models/Interaction.js'
import { logger } from '../src/utils/logger.js'

// 测试数据
const testDrugs = [
  {
    name: '阿司匹林',
    genericName: 'Aspirin',
    description: '非甾体抗炎药，用于解热镇痛',
    category: '解热镇痛药',
    source: 'manual',
  },
  {
    name: '华法林',
    genericName: 'Warfarin',
    description: '抗凝血药，用于预防血栓',
    category: '抗凝血药',
    source: 'manual',
  },
  {
    name: '布洛芬',
    genericName: 'Ibuprofen',
    description: '非甾体抗炎药，用于解热镇痛',
    category: '解热镇痛药',
    source: 'manual',
  },
]

const testInteraction = {
  interactionType: '增强抗凝作用',
  severity: 'high',
  description: '阿司匹林和华法林同时使用会增强抗凝作用，增加出血风险',
  recommendation: '避免同时使用，如必须使用需密切监测凝血功能',
  source: 'database',
}

async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
    })
    logger.info('数据库连接成功')
  } catch (error) {
    logger.error('数据库连接失败', { error: error.message })
    throw error
  }
}

async function disconnectDB() {
  try {
    await mongoose.connection.close()
    logger.info('数据库连接已关闭')
  } catch (error) {
    logger.error('关闭数据库连接失败', { error: error.message })
  }
}

async function cleanupTestData() {
  try {
    // 删除测试药物
    await Drug.deleteMany({
      name: { $in: testDrugs.map(d => d.name) },
    })
    // 删除测试相互作用
    await Interaction.deleteMany({
      drug1Name: { $in: testDrugs.map(d => d.name) },
    })
    logger.info('测试数据清理完成')
  } catch (error) {
    logger.error('清理测试数据失败', { error: error.message })
  }
}

async function setupTestData() {
  try {
    // 创建测试药物
    const drugs = await Drug.insertMany(testDrugs)
    logger.info('测试药物创建成功', { count: drugs.length })

    // 创建一个测试相互作用
    const interaction = new Interaction({
      drug1Id: drugs[0]._id,
      drug2Id: drugs[1]._id,
      drug1Name: drugs[0].name,
      drug2Name: drugs[1].name,
      ...testInteraction,
    })
    await interaction.save()
    logger.info('测试相互作用创建成功')

    return drugs
  } catch (error) {
    logger.error('设置测试数据失败', { error: error.message })
    throw error
  }
}

// 测试1: findInteraction - 查找两种药物之间的相互作用
async function testFindInteraction(drugs) {
  console.log('\n=== 测试1: findInteraction ===')
  try {
    // 测试查找存在的相互作用
    const interaction = await interactionService.findInteraction(
      drugs[0]._id.toString(),
      drugs[1]._id.toString()
    )

    if (interaction) {
      console.log('✓ 成功查找到相互作用')
      console.log(`  药物1: ${interaction.drug1Name}`)
      console.log(`  药物2: ${interaction.drug2Name}`)
      console.log(`  严重程度: ${interaction.severity}`)
    } else {
      console.log('✗ 未找到相互作用')
    }

    // 测试查找不存在的相互作用
    const noInteraction = await interactionService.findInteraction(
      drugs[0]._id.toString(),
      drugs[2]._id.toString()
    )

    if (!noInteraction) {
      console.log('✓ 正确返回null（不存在的相互作用）')
    } else {
      console.log('✗ 应该返回null但返回了数据')
    }
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 测试2: saveInteraction - 保存相互作用记录
async function testSaveInteraction(drugs) {
  console.log('\n=== 测试2: saveInteraction ===')
  try {
    const newInteraction = {
      drug1Id: drugs[0]._id.toString(),
      drug2Id: drugs[2]._id.toString(),
      drug1Name: drugs[0].name,
      drug2Name: drugs[2].name,
      interactionType: '增强胃肠道副作用',
      severity: 'medium',
      description: '两种非甾体抗炎药同时使用会增加胃肠道不良反应',
      recommendation: '避免同时使用，如需使用建议间隔服用',
      source: 'database',
    }

    const saved = await interactionService.saveInteraction(newInteraction)

    if (saved && saved._id) {
      console.log('✓ 成功保存相互作用记录')
      console.log(`  ID: ${saved._id}`)
      console.log(`  药物1: ${saved.drug1Name}`)
      console.log(`  药物2: ${saved.drug2Name}`)
      console.log(`  严重程度: ${saved.severity}`)
    } else {
      console.log('✗ 保存失败')
    }

    // 测试重复保存（应该返回现有记录）
    const duplicate = await interactionService.saveInteraction(newInteraction)
    if (duplicate._id.toString() === saved._id.toString()) {
      console.log('✓ 正确处理重复保存（返回现有记录）')
    } else {
      console.log('✗ 重复保存处理不正确')
    }
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 测试3: calculateOverallRisk - 计算整体风险等级
async function testCalculateOverallRisk() {
  console.log('\n=== 测试3: calculateOverallRisk ===')
  try {
    // 测试高风险
    const highRiskInteractions = [
      { severity: 'high' },
      { severity: 'low' },
    ]
    const highRisk = interactionService.calculateOverallRisk(highRiskInteractions)
    console.log(`✓ 高风险测试: ${highRisk === 'high' ? '通过' : '失败'}`)

    // 测试中风险（2个medium）
    const mediumRiskInteractions = [
      { severity: 'medium' },
      { severity: 'medium' },
    ]
    const mediumToHighRisk = interactionService.calculateOverallRisk(mediumRiskInteractions)
    console.log(`✓ 多个中风险测试: ${mediumToHighRisk === 'high' ? '通过' : '失败'}`)

    // 测试中风险（1个medium）
    const singleMediumRisk = [
      { severity: 'medium' },
      { severity: 'low' },
    ]
    const mediumRisk = interactionService.calculateOverallRisk(singleMediumRisk)
    console.log(`✓ 单个中风险测试: ${mediumRisk === 'medium' ? '通过' : '失败'}`)

    // 测试低风险
    const lowRiskInteractions = [
      { severity: 'low' },
      { severity: 'low' },
    ]
    const lowRisk = interactionService.calculateOverallRisk(lowRiskInteractions)
    console.log(`✓ 低风险测试: ${lowRisk === 'low' ? '通过' : '失败'}`)

    // 测试空数组
    const emptyRisk = interactionService.calculateOverallRisk([])
    console.log(`✓ 空数组测试: ${emptyRisk === 'low' ? '通过' : '失败'}`)
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 测试4: checkInteractions - 检测多药物相互作用（数据库优先）
async function testCheckInteractionsDatabase(drugs) {
  console.log('\n=== 测试4: checkInteractions (数据库优先) ===')
  try {
    // 测试两个药物（数据库中存在相互作用）
    const result = await interactionService.checkInteractions([
      drugs[0]._id.toString(),
      drugs[1]._id.toString(),
    ])

    console.log('✓ 检测完成')
    console.log(`  药物数量: ${result.drugCount}`)
    console.log(`  相互作用数量: ${result.interactionCount}`)
    console.log(`  风险等级: ${result.riskLevel}`)
    console.log(`  数据来源: ${result.source}`)

    if (result.source === 'database') {
      console.log('✓ 正确使用数据库数据（缓存优先策略）')
    } else {
      console.log('✗ 应该使用数据库数据')
    }

    if (result.interactions.length > 0) {
      console.log('✓ 返回了相互作用数据')
    } else {
      console.log('✗ 未返回相互作用数据')
    }
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 测试5: checkInteractions - 检测多药物相互作用（AI补充）
async function testCheckInteractionsWithAI(drugs) {
  console.log('\n=== 测试5: checkInteractions (AI补充) ===')
  console.log('注意: 此测试需要AI接口可用，可能需要较长时间')
  
  try {
    // 测试三个药物（部分相互作用不在数据库中）
    const result = await interactionService.checkInteractions([
      drugs[0]._id.toString(),
      drugs[1]._id.toString(),
      drugs[2]._id.toString(),
    ])

    console.log('✓ 检测完成')
    console.log(`  药物数量: ${result.drugCount}`)
    console.log(`  相互作用数量: ${result.interactionCount}`)
    console.log(`  风险等级: ${result.riskLevel}`)
    console.log(`  数据来源: ${result.source}`)

    if (result.source === 'mixed' || result.source === 'ai') {
      console.log('✓ 正确调用AI补充缺失数据')
    }

    // 验证所有药物对都有相互作用数据
    const expectedPairs = (drugs.length * (drugs.length - 1)) / 2
    if (result.interactionCount === expectedPairs) {
      console.log('✓ 所有药物对都有相互作用数据')
    } else {
      console.log(`⚠ 相互作用数量不完整: 期望${expectedPairs}，实际${result.interactionCount}`)
    }
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
    if (error.code === 'AI_TIMEOUT' || error.code === 'AI_CONNECTION_ERROR') {
      console.log('  (AI接口不可用，这是预期的)')
    }
  }
}

// 测试6: findByDrugId - 查询药物的所有相互作用
async function testFindByDrugId(drugs) {
  console.log('\n=== 测试6: findByDrugId ===')
  try {
    const interactions = await interactionService.findByDrugId(
      drugs[0]._id.toString()
    )

    console.log(`✓ 查询到 ${interactions.length} 个相互作用`)
    
    if (interactions.length >= 2) {
      console.log('✓ 正确返回药物的所有相互作用')
    }

    interactions.forEach((interaction, index) => {
      console.log(`  ${index + 1}. ${interaction.drug1Name} ↔ ${interaction.drug2Name}`)
    })
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 测试7: findBySeverity - 按严重程度查询
async function testFindBySeverity() {
  console.log('\n=== 测试7: findBySeverity ===')
  try {
    const highSeverity = await interactionService.findBySeverity('high')
    console.log(`✓ 高风险相互作用: ${highSeverity.length} 个`)

    const mediumSeverity = await interactionService.findBySeverity('medium')
    console.log(`✓ 中风险相互作用: ${mediumSeverity.length} 个`)

    const lowSeverity = await interactionService.findBySeverity('low')
    console.log(`✓ 低风险相互作用: ${lowSeverity.length} 个`)
  } catch (error) {
    console.log('✗ 测试失败:', error.message)
  }
}

// 主测试函数
async function runTests() {
  console.log('========================================')
  console.log('InteractionService 测试开始')
  console.log('========================================')

  let drugs = null

  try {
    // 连接数据库
    await connectDB()

    // 清理旧的测试数据
    await cleanupTestData()

    // 设置测试数据
    drugs = await setupTestData()

    // 运行测试
    await testFindInteraction(drugs)
    await testSaveInteraction(drugs)
    await testCalculateOverallRisk()
    await testCheckInteractionsDatabase(drugs)
    await testCheckInteractionsWithAI(drugs)
    await testFindByDrugId(drugs)
    await testFindBySeverity()

    console.log('\n========================================')
    console.log('所有测试完成')
    console.log('========================================')
  } catch (error) {
    console.error('测试过程中发生错误:', error.message)
  } finally {
    // 清理测试数据
    await cleanupTestData()

    // 断开数据库连接
    await disconnectDB()
  }
}

// 运行测试
runTests().catch(console.error)
