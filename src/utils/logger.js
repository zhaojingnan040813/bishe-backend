import winston from 'winston'
import { config } from '../config/env.js'

const { combine, timestamp, printf, colorize, errors } = winston.format

// 自定义日志格式
const logFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`
  }
  return `${timestamp} [${level}]: ${message}`
})

// 创建logger实例
export const logger = winston.createLogger({
  level: config.log.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
})

// 开发环境下输出更详细的日志
if (config.nodeEnv === 'development') {
  logger.level = 'debug'
}
