/**
 * DrugService 手动测试脚本
 * 测试药物服务层的各项功能
 */

import dotenv from 'dotenv'
import { connectDB } from '../src/config/database.js'
import { drugService } from '../src/services/DrugService.js'
import mongoose from 'mongoose'

// 加载环境变量
dotenv.config()

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: [],
}

// 测试辅助函数
function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`)
    results.passed++
    results.tests.push({ name: message, status: 'passed' })
  } else {
    console.error(`✗ ${message}`)
    results.failed++
    results.tests.push({ name: message, status: 'failed' })
  }
}

function assertThrows(fn, message) {
  try {
    fn()
    console.error(`✗ ${message} (应该抛出错误但没有)`)
    results.failed++
    results.tests.push({ name: message, status: 'failed' })
  } catch (error) {
    console.log(`✓ ${message}`)
    results.passed++
    results.tests.push({ name: message, status: 'passed' })
  }
}

async function assertRejects(promise, message) {
  try {
    await promise
    console.error(`✗ ${message} (应该拒绝但没有)`)
    results.failed++
    results.tests.push({ name: message, status: 'failed' })
    return false
  } catch (error) {
    console.log(`✓ ${message}`)
    results.passed++
    results.tests.push({ name: message, status: 'passed' })
    return true
  }
}

// 测试套件
async function runTests() {
  console.log('='.repeat(60))
  console.log('DrugService 测试开始')
  console.log('='.repeat(60))
  console.log()

  try {
    // 连接数据库
    await connectDB()
    console.log('✓ 数据库连接成功\n')

    // 测试1: findAll - 分页查询
    console.log('测试 1: findAll - 分页查询')
    console.log('-'.repeat(60))
    const page1 = await drugService.findAll(1, 5)
    assert(page1.drugs !== undefined, '返回结果包含drugs字段')
    assert(page1.total !== undefined, '返回结果包含total字段')
    assert(page1.page === 1, '页码正确')
    assert(page1.totalPages !== undefined, '返回结果包含totalPages字段')
    assert(Array.isArray(page1.drugs), 'drugs是数组')
    assert(page1.drugs.length <= 5, '返回数量不超过limit')
    console.log(`  查询结果: ${page1.drugs.length} 条记录, 共 ${page1.total} 条\n`)

    // 测试2: search - 模糊搜索
    console.log('测试 2: search - 模糊搜索')
    console.log('-'.repeat(60))
    
    // 先获取一个存在的药物名称
    if (page1.drugs.length > 0) {
      const existingDrug = page1.drugs[0]
      const searchTerm = existingDrug.name.substring(0, 2)
      const searchResults = await drugService.search(searchTerm)
      assert(Array.isArray(searchResults), '搜索结果是数组')
      assert(searchResults.length > 0, '找到匹配的药物')
      
      // 验证搜索结果包含关键词（不区分大小写）
      const allMatch = searchResults.every(drug => 
        drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drug.genericName && drug.genericName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      assert(allMatch, '所有结果都包含搜索关键词')
      console.log(`  搜索 "${searchTerm}": 找到 ${searchResults.length} 条记录\n`)
    } else {
      console.log('  跳过搜索测试（数据库为空）\n')
    }

    // 测试3: search - 空关键词
    console.log('测试 3: search - 输入验证')
    console.log('-'.repeat(60))
    await assertRejects(drugService.search(''), '空字符串应该抛出错误')
    await assertRejects(drugService.search('   '), '空白字符串应该抛出错误')
    await assertRejects(drugService.search(null), 'null应该抛出错误')
    console.log()

    // 测试4: findById
    console.log('测试 4: findById - 根据ID查询')
    console.log('-'.repeat(60))
    if (page1.drugs.length > 0) {
      const existingDrug = page1.drugs[0]
      const foundDrug = await drugService.findById(existingDrug._id.toString())
      assert(foundDrug !== null, '找到药物')
      assert(foundDrug._id.toString() === existingDrug._id.toString(), 'ID匹配')
      assert(foundDrug.name === existingDrug.name, '名称匹配')
      console.log(`  查询药物: ${foundDrug.name}\n`)
    } else {
      console.log('  跳过findById测试（数据库为空）\n')
    }

    // 测试5: findById - 不存在的ID
    console.log('测试 5: findById - 不存在的ID')
    console.log('-'.repeat(60))
    const nonExistentId = '507f1f77bcf86cd799439011'
    const notFound = await drugService.findById(nonExistentId)
    assert(notFound === null, '不存在的ID返回null')
    console.log()

    // 测试6: create - 创建药物
    console.log('测试 6: create - 创建药物')
    console.log('-'.repeat(60))
    const testDrugName = `测试药物_${Date.now()}`
    const newDrug = await drugService.create({
      name: testDrugName,
      description: '这是一个测试药物',
      category: '测试分类',
      source: 'manual',
    })
    assert(newDrug !== null, '创建成功')
    assert(newDrug.name === testDrugName, '名称正确')
    assert(newDrug._id !== undefined, '有ID')
    console.log(`  创建药物: ${newDrug.name}\n`)

    // 测试7: create - 重复名称
    console.log('测试 7: create - 重复名称验证')
    console.log('-'.repeat(60))
    await assertRejects(
      drugService.create({
        name: testDrugName,
        description: '重复的药物',
        category: '测试分类',
      }),
      '重复名称应该抛出错误'
    )
    console.log()

    // 测试8: create - 缺少必需字段
    console.log('测试 8: create - 必需字段验证')
    console.log('-'.repeat(60))
    await assertRejects(
      drugService.create({ name: '测试' }),
      '缺少description应该抛出错误'
    )
    await assertRejects(
      drugService.create({ description: '测试' }),
      '缺少name应该抛出错误'
    )
    await assertRejects(
      drugService.create({ name: '测试', description: '测试' }),
      '缺少category应该抛出错误'
    )
    console.log()

    // 测试9: findByName
    console.log('测试 9: findByName - 根据名称查询')
    console.log('-'.repeat(60))
    const foundByName = await drugService.findByName(testDrugName)
    assert(foundByName !== null, '找到药物')
    assert(foundByName.name === testDrugName, '名称匹配')
    console.log(`  查询药物: ${foundByName.name}\n`)

    // 测试10: findByName - 不区分大小写
    console.log('测试 10: findByName - 不区分大小写')
    console.log('-'.repeat(60))
    const foundByNameCaseInsensitive = await drugService.findByName(testDrugName.toUpperCase())
    assert(foundByNameCaseInsensitive !== null, '不区分大小写查询成功')
    console.log()

    // 测试11: update
    console.log('测试 11: update - 更新药物')
    console.log('-'.repeat(60))
    const updatedDrug = await drugService.update(newDrug._id.toString(), {
      description: '更新后的描述',
      dosage: '每日一次',
    })
    assert(updatedDrug.description === '更新后的描述', '描述已更新')
    assert(updatedDrug.dosage === '每日一次', '用量已更新')
    assert(updatedDrug.name === testDrugName, '名称未改变')
    console.log(`  更新药物: ${updatedDrug.name}\n`)

    // 测试12: findOrAnalyze - 缓存优先策略（数据库存在）
    console.log('测试 12: findOrAnalyze - 缓存优先策略（数据库存在）')
    console.log('-'.repeat(60))
    const cachedResult = await drugService.findOrAnalyze(testDrugName)
    assert(cachedResult.drug !== null, '返回药物数据')
    assert(cachedResult.source === 'database', '数据来源是database')
    assert(cachedResult.drug.name === testDrugName, '名称匹配')
    console.log(`  从数据库获取: ${cachedResult.drug.name}, 来源: ${cachedResult.source}\n`)

    // 测试13: findOrAnalyze - AI降级机制（数据库不存在）
    console.log('测试 13: findOrAnalyze - AI降级机制（数据库不存在）')
    console.log('-'.repeat(60))
    console.log('  注意: 此测试会调用真实的AI接口，可能需要较长时间...')
    
    try {
      const nonExistentDrugName = `不存在的药物_${Date.now()}`
      const aiResult = await drugService.findOrAnalyze(nonExistentDrugName)
      assert(aiResult.drug !== null, 'AI返回药物数据')
      assert(aiResult.source === 'ai', '数据来源是ai')
      assert(aiResult.drug.source === 'ai', '药物记录标记为AI来源')
      assert(aiResult.drug._id !== undefined, 'AI结果已保存到数据库')
      console.log(`  AI分析成功: ${aiResult.drug.name}, 来源: ${aiResult.source}`)
      console.log(`  已保存到数据库, ID: ${aiResult.drug._id}\n`)
      
      // 验证AI结果持久化 - 再次查询应该从数据库获取
      const cachedAiResult = await drugService.findOrAnalyze(aiResult.drug.name)
      assert(cachedAiResult.source === 'database', 'AI结果已缓存，第二次查询从数据库获取')
      console.log(`  验证缓存: 第二次查询来源为 ${cachedAiResult.source}\n`)
      
      // 清理AI创建的测试数据
      await drugService.delete(aiResult.drug._id.toString())
      console.log(`  已清理AI测试数据\n`)
    } catch (error) {
      console.error(`  ✗ AI测试失败: ${error.message}`)
      console.log('  这可能是因为AI接口不可用或配置问题\n')
      results.failed++
      results.tests.push({ name: 'AI降级机制测试', status: 'failed' })
    }

    // 测试14: delete
    console.log('测试 14: delete - 删除药物')
    console.log('-'.repeat(60))
    const deleteResult = await drugService.delete(newDrug._id.toString())
    assert(deleteResult === true, '删除成功')
    
    const deletedDrug = await drugService.findById(newDrug._id.toString())
    assert(deletedDrug === null, '药物已被删除')
    console.log(`  删除药物: ${testDrugName}\n`)

    // 测试15: delete - 不存在的ID
    console.log('测试 15: delete - 不存在的ID')
    console.log('-'.repeat(60))
    await assertRejects(
      drugService.delete(nonExistentId),
      '删除不存在的药物应该抛出错误'
    )
    console.log()

  } catch (error) {
    console.error('测试过程中发生错误:', error)
    results.failed++
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close()
    console.log('✓ 数据库连接已关闭\n')
  }

  // 输出测试结果
  console.log('='.repeat(60))
  console.log('测试结果汇总')
  console.log('='.repeat(60))
  console.log(`通过: ${results.passed}`)
  console.log(`失败: ${results.failed}`)
  console.log(`总计: ${results.passed + results.failed}`)
  console.log('='.repeat(60))

  // 退出进程
  process.exit(results.failed > 0 ? 1 : 0)
}

// 运行测试
runTests().catch((error) => {
  console.error('测试运行失败:', error)
  process.exit(1)
})
