import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI
    const dbName = process.env.DB_NAME || 'drug_interaction_db'

    await mongoose.connect(mongoUri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    logger.info(`MongoDB连接成功: ${dbName}`)

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB连接错误:', err)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB连接断开')
    })

    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('MongoDB连接已关闭')
      process.exit(0)
    })
  } catch (error) {
    logger.error('MongoDB连接失败:', error)
    throw error
  }
}
