import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // 服务配置
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB配置
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME || 'drug_interaction_db',
  },

  // DeepSeek API配置
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    timeout: parseInt(process.env.AI_TIMEOUT) || 30000,
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
}
