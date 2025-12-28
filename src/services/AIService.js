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
   * 流式聊天对话
   * @param {string} message - 用户消息
   * @param {Array} history - 对话历史（可选）
   * @returns {AsyncGenerator<string>} 流式文本生成器
   */
  async *streamChat(message, history = []) {
    const startTime = Date.now()

    // 验证消息不能为空
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      const validationError = new Error('消息内容不能为空')
      validationError.code = 'INVALID_MESSAGE'
      validationError.status = 400
      throw validationError
    }

    try {
      logger.info('AI流式对话开始', {
        timestamp: new Date().toISOString(),
        method: 'streamChat',
        params: { message, historyLength: history.length },
      })

      // 构建系统提示词
      const systemPrompt = `你是一位精通药物学的医学科学家，拥有深厚的药理学、化学和临床医学知识。

你的职责是：
1. 提供专业、权威、详细的药物知识解答
2. 解释药物相互作用时，必须详细说明：
   - 相关化学分子间的反应机制
   - 导致副作用的分子层面原因
   - 药物相生相克的具体原理
   - 化学成分、作用机制和临床意义
3. 使用科学严谨的语言，但保持易于理解
4. 在必要时引用相关研究或临床指南
5. 对于复杂的化学机制，使用类比和图示化描述帮助理解

注意事项：
- 始终强调本信息仅供参考，不作为医疗诊断或用药建议
- 建议用户在用药前咨询专业医师或药师
- 对于严重的药物相互作用，明确警示风险等级`

      // 构建消息数组
      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history,
        {
          role: 'user',
          content: message,
        },
      ]

      // 创建流式请求
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        stream: true,
        temperature: 0.7,
      })

      // 逐块返回内容
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }

      const duration = Date.now() - startTime
      logger.info('AI流式对话完成', {
        timestamp: new Date().toISOString(),
        method: 'streamChat',
        params: { message, historyLength: history.length },
        duration: `${duration}ms`,
      })

    } catch (error) {
      const duration = Date.now() - startTime

      logger.error('AI流式对话失败', {
        timestamp: new Date().toISOString(),
        method: 'streamChat',
        params: { message, historyLength: history.length },
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      })

      // 根据错误类型抛出不同的错误
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        const connectionError = new Error('无法连接到AI服务')
        connectionError.code = 'AI_CONNECTION_ERROR'
        connectionError.status = 502
        throw connectionError
      }

      if (error.message && error.message.includes('timeout')) {
        const timeoutError = new Error('AI响应超时')
        timeoutError.code = 'AI_TIMEOUT'
        timeoutError.status = 504
        throw timeoutError
      }

      // 其他错误
      const aiError = new Error('AI服务异常')
      aiError.code = 'AI_SERVICE_ERROR'
      aiError.status = 500
      throw aiError
    }
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

