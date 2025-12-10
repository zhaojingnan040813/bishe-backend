/**
 * 后端基础架构测试脚本
 * 验证所有配置是否正确
 */

import { config } from '../src/config/env.js'
import { logger } from '../src/utils/logger.js'
import { connectDB } from '../src/config/database.js'
import mongoose from 'mongoose'

async function testInfrastructure() {
  console.log('=== 开始测试后端基础架构 ===\n')

  // 1. 测试环境变量配置
  console.log('1. 测试环境变量配置...')
  try {
    console.log('   ✓ 端口:', config.port)
    console.log('   ✓ 环境:', config.nodeEnv)
    console.log('   ✓ MongoDB URI:', config.mongodb.uri ? '已配置' : '未配置')
    console.log('   ✓ MongoDB 数据库名:', config.mongodb.dbName)
    console.log('   ✓ DeepSeek API Key:', config.deepseek.apiKey ? '已配置' : '未配置')
    console.log('   ✓ DeepSeek Base URL:', config.deepseek.baseUrl)
    console.log('   ✓ AI 超时时间:', config.deepseek.timeout, 'ms')
    console.log('   ✓ 日志级别:', config.log.level)
    console.log('   环境变量配置测试通过 ✓\n')
  } catch (error) {
    console.error('   环境变量配置测试失败 ✗')
    console.error('   错误:', error.message)
    process.exit(1)
  }

  // 2. 测试日志系统
  console.log('2. 测试日志系统...')
  try {
    logger.info('测试 info 级别日志')
    logger.warn('测试 warn 级别日志')
    logger.error('测试 error 级别日志')
    console.log('   日志系统测试通过 ✓\n')
  } catch (error) {
    console.error('   日志系统测试失败 ✗')
    console.error('   错误:', error.message)
    process.exit(1)
  }

  // 3. 测试 MongoDB 连接
  console.log('3. 测试 MongoDB 连接...')
  try {
    await connectDB()
    console.log('   MongoDB 连接测试通过 ✓\n')

    // 测试数据库操作
    console.log('4. 测试数据库操作...')
    const testCollection = mongoose.connection.db.collection('test')
    await testCollection.insertOne({ test: true, timestamp: new Date() })
    const doc = await testCollection.findOne({ test: true })
    await testCollection.deleteOne({ test: true })
    console.log('   数据库操作测试通过 ✓\n')

  } catch (error) {
    console.error('   MongoDB 连接测试失败 ✗')
    console.error('   错误:', error.message)
    process.exit(1)
  }

  // 5. 测试错误处理
  console.log('5. 测试错误处理中间件...')
  try {
    const { errorHandler } = await import('../src/middleware/errorHandler.js')
    console.log('   错误处理中间件加载成功 ✓\n')
  } catch (error) {
    console.error('   错误处理中间件测试失败 ✗')
    console.error('   错误:', error.message)
    process.exit(1)
  }

  console.log('=== 所有基础架构测试通过 ✓ ===\n')

  // 关闭数据库连接
  await mongoose.connection.close()
  console.log('数据库连接已关闭')
  process.exit(0)
}

testInfrastructure().catch((error) => {
  console.error('测试过程中发生错误:', error)
  process.exit(1)
})
