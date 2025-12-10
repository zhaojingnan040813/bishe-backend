import OpenAI from 'openai'
import { config } from '../config/env.js'
import { logger } from '../utils/logger.js'

/**
 * AI服务类 - 使用DeepSeek API（OpenAI兼容格式）
 */
class AIService {
  constructor() {
    // 初始化OpenAI客户端（兼容DeepSeek）
    this.client = new OpenAI({
      apiKey: config.deepseek.apiKey,
      baseURL: config.deepseek.baseUrl,
      timeout: config.deepseek.timeout,
    })

    this.timeout = config.deepseek.timeout
    this.model = 'deepseek-chat' // DeepSeek模型名称
  }

  /**
   * 分析单个药物信息
   * @param {string} drugName - 药物名称
   * @returns {Promise<Object>} AI分析结果
   */
  async analyzeDrug(drugName) {
    const startTime = Date.now()
    
    try {
      logger.info('AI调用开始', {
        timestamp: new Date().toISOString(),
        method: 'analyzeDrug',
        params: { drugName },
      })

      const prompt = `请分析以下药物的详细信息，包括：
1. 药物通用名和商品名
2. 药物分类
3. 主要用途和适应症
4. 常见副作用
5. 禁忌症
6. 用法用量建议

药物名称：${drugName}

请以JSON格式返回结果，包含以下字段：
{
  "name": "药物名称",
  "genericName": "通用名",
  "category": "分类",
  "description": "简短描述（1-2句话）",
  "sideEffects": ["副作用1", "副作用2"],
  "contraindications": ["禁忌症1", "禁忌症2"],
  "dosage": "用法用量",
  "aiAnalysis": "详细的长文本描述，包含以下内容：\n1. 药物的特性和基本信息\n2. 药物的起源和历史背景\n3. 与哪些药物相生相克（相互作用）\n4. 主要成分构成及各成分的作用\n5. 作用机制（为什么能起到这样的作用）\n6. 可替代的药物或物品\n7. 其他重要信息"
}`

      // 使用超时控制
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的药物信息分析助手，请提供准确、专业、详细的药物信息。对于aiAnalysis字段，请提供一个详细的、结构化的长文本描述，包含药物的各个方面。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
        this._createTimeoutPromise(),
      ])

      const content = response.choices[0].message.content
      const result = JSON.parse(content)

      const duration = Date.now() - startTime
      logger.info('AI调用成功', {
        timestamp: new Date().toISOString(),
        method: 'analyzeDrug',
        params: { drugName },
        duration: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error('AI调用失败', {
        timestamp: new Date().toISOString(),
        method: 'analyzeDrug',
        params: { drugName },
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      })

      // 根据错误类型返回不同的错误信息
      if (error.message === 'AI_TIMEOUT') {
        const timeoutError = new Error('AI接口调用超时，请稍后重试')
        timeoutError.code = 'AI_TIMEOUT'
        timeoutError.status = 504
        throw timeoutError
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        const connectionError = new Error('无法连接到AI服务，请检查网络连接')
        connectionError.code = 'AI_CONNECTION_ERROR'
        connectionError.status = 502
        throw connectionError
      }

      // 其他错误
      const aiError = new Error(`AI分析失败: ${error.message}`)
      aiError.code = 'AI_ANALYSIS_ERROR'
      aiError.status = 500
      throw aiError
    }
  }

  /**
   * 分析多个药物之间的相互作用
   * @param {string[]} drugNames - 药物名称数组
   * @returns {Promise<Object>} 相互作用分析结果
   */
  async analyzeInteractions(drugNames) {
    const startTime = Date.now()

    try {
      logger.info('AI调用开始', {
        timestamp: new Date().toISOString(),
        method: 'analyzeInteractions',
        params: { drugNames, count: drugNames.length },
      })

      const prompt = `请分析以下药物之间的相互作用：

药物列表：${drugNames.join('、')}

请详细分析这些药物之间可能存在的相互作用，包括：
1. 每对药物之间的相互作用类型
2. 相互作用的严重程度（low/medium/high）
3. 相互作用的详细描述
4. 临床建议

请以JSON格式返回结果，包含以下结构：
{
  "interactions": [
    {
      "drug1": "药物1名称",
      "drug2": "药物2名称",
      "interactionType": "相互作用类型",
      "severity": "low|medium|high",
      "description": "详细描述",
      "recommendation": "临床建议"
    }
  ],
  "overallRisk": "low|medium|high",
  "summary": "总体评估"
}`

      // 使用超时控制
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的药物相互作用分析专家，请提供准确、专业的药物相互作用分析。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
        this._createTimeoutPromise(),
      ])

      const content = response.choices[0].message.content
      const result = JSON.parse(content)

      const duration = Date.now() - startTime
      logger.info('AI调用成功', {
        timestamp: new Date().toISOString(),
        method: 'analyzeInteractions',
        params: { drugNames, count: drugNames.length },
        duration: `${duration}ms`,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('AI调用失败', {
        timestamp: new Date().toISOString(),
        method: 'analyzeInteractions',
        params: { drugNames, count: drugNames.length },
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      })

      // 根据错误类型返回不同的错误信息
      if (error.message === 'AI_TIMEOUT') {
        const timeoutError = new Error('AI接口调用超时，请稍后重试')
        timeoutError.code = 'AI_TIMEOUT'
        timeoutError.status = 504
        throw timeoutError
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        const connectionError = new Error('无法连接到AI服务，请检查网络连接')
        connectionError.code = 'AI_CONNECTION_ERROR'
        connectionError.status = 502
        throw connectionError
      }

      // 其他错误
      const aiError = new Error(`AI相互作用分析失败: ${error.message}`)
      aiError.code = 'AI_ANALYSIS_ERROR'
      aiError.status = 500
      throw aiError
    }
  }

  /**
   * 创建超时Promise
   * @private
   * @returns {Promise} 超时Promise
   */
  _createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('AI_TIMEOUT'))
      }, this.timeout)
    })
  }

  /**
   * 健康检查
   * @returns {Promise<boolean>} 是否健康
   */
  async healthCheck() {
    try {
      const response = await Promise.race([
        this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
          max_tokens: 10,
        }),
        this._createTimeoutPromise(),
      ])

      return response.choices && response.choices.length > 0
    } catch (error) {
      logger.error('AI健康检查失败', { error: error.message })
      return false
    }
  }
}

// 导出单例
export const aiService = new AIService()

