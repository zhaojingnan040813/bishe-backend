/**
 * SSE流式响应的属性测试
 * Feature: ai-chat
 * 使用fast-check进行基于属性的测试
 * 
 * Property 11: SSE响应格式正确性
 * Property 12: SSE流结束标记
 * 
 * Requirements: 10.2, 10.3, 10.4, 10.5
 */

import fc from 'fast-check'
import { config } from '../src/config/env.js'
import { logger } from '../src/utils/logger.js'

const BASE_URL = `http://localhost:${config.port}`

/**
 * 辅助函数：解析SSE流
 */
function parseSSEStream(sseText) {
    const events = []
    const lines = sseText.split('\n')

    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const dataStr = line.substring(6)
            try {
                const data = JSON.parse(dataStr)
                events.push(data)
            } catch (error) {
                // 忽略解析错误
            }
        }
    }

    return events
}

/**
 * 辅助函数：发送流式聊天请求
 */
async function sendStreamChatRequest(message, history = []) {
    const url = `${BASE_URL}/api/ai/chat/stream`

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, history }),
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const contentType = response.headers.get('content-type')
        const text = await response.text()

        return {
            status: response.status,
            headers: { contentType },
            text,
            events: parseSSEStream(text),
        }
    } catch (error) {
        logger.error('流式聊天请求失败', { error: error.message })
        throw error
    }
}

/**
 * 辅助函数：等待服务器启动
 */
async function waitForServer(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${BASE_URL}/health`)
            if (response.ok) return true
        } catch (error) {
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }
    throw new Error('服务器启动超时')
}

/**
 * Property 11: SSE响应格式正确性
 * Feature: ai-chat, Property 11: 对于任何流式聊天请求，响应应该使用正确的SSE格式（Content-Type: text/event-stream）并在每个数据块中返回增量文本
 * Validates: Requirements 10.2, 10.3, 10.5
 */
async function testProperty11_SSEResponseFormat() {
    console.log('\n=== Property 11: SSE响应格式正确性 ===')
    console.log('验证Content-Type为text/event-stream')
    console.log('验证每个数据块包含增量文本\n')

    const messageArbitrary = fc.string({ minLength: 5, maxLength: 30 })
        .filter(s => s.trim().length >= 5)

    let testsPassed = 0
    let testsFailed = 0
    let testsRun = 0

    try {
        await fc.assert(
            fc.asyncProperty(messageArbitrary, async (message) => {
                testsRun++
                try {
                    const response = await sendStreamChatRequest(message)

                    const hasCorrectContentType = response.headers.contentType?.includes('text/event-stream')
                    const hasEvents = response.events.length > 0
                    const hasStartEvent = response.events.some(e => e.type === 'start')
                    const contentEvents = response.events.filter(e => e.type === 'content')
                    const hasDoneEvent = response.events.some(e => e.type === 'done')
                    const hasContentOrDone = contentEvents.length > 0 || hasDoneEvent
                    const allContentEventsHaveText = contentEvents.length === 0 ||
                        contentEvents.every(e => typeof e.text === 'string' && e.text.length > 0)

                    const passed = hasCorrectContentType && hasEvents && hasStartEvent &&
                        hasContentOrDone && allContentEventsHaveText

                    if (passed) {
                        testsPassed++
                        console.log(`  ✓ 测试 ${testsRun} 通过`)
                    } else {
                        testsFailed++
                        console.log(`  ✗ 测试 ${testsRun} 失败`)
                        console.log(`    Content-Type正确: ${hasCorrectContentType}`)
                        console.log(`    有事件: ${hasEvents}, start事件: ${hasStartEvent}`)
                        console.log(`    有content/done: ${hasContentOrDone}, text有效: ${allContentEventsHaveText}`)
                    }

                    return passed
                } catch (error) {
                    testsFailed++
                    console.log(`  ✗ 测试 ${testsRun} 异常: ${error.message}`)
                    return false
                }
            }),
            { numRuns: 5, verbose: false }
        )
    } catch (error) {
        console.log(`\nfast-check检测到失败: ${error.message}`)
    }

    console.log(`\n测试完成: ${testsPassed} 通过, ${testsFailed} 失败 (共 ${testsRun} 次)`)
    console.log('✓ Property 11 验证完成\n')

    return testsFailed === 0
}

/**
 * Property 12: SSE流结束标记
 * Feature: ai-chat, Property 12: 对于任何完成的AI回答，系统应该发送结束标记并正确关闭SSE连接
 * Validates: Requirements 10.4
 */
async function testProperty12_SSEStreamEndMarker() {
    console.log('\n=== Property 12: SSE流结束标记 ===')
    console.log('验证完成时发送done事件并关闭连接\n')

    const messageArbitrary = fc.string({ minLength: 5, maxLength: 30 })
        .filter(s => s.trim().length >= 5)

    let testsPassed = 0
    let testsFailed = 0
    let testsRun = 0

    try {
        await fc.assert(
            fc.asyncProperty(messageArbitrary, async (message) => {
                testsRun++
                try {
                    const response = await sendStreamChatRequest(message)

                    const hasDoneEvent = response.events.some(e => e.type === 'done')
                    const lastEvent = response.events[response.events.length - 1]
                    const isDoneLastEvent = lastEvent?.type === 'done'
                    const doneIndex = response.events.findIndex(e => e.type === 'done')
                    const noContentAfterDone = doneIndex === -1 ||
                        !response.events.slice(doneIndex + 1).some(e => e.type === 'content')

                    const passed = hasDoneEvent && isDoneLastEvent && noContentAfterDone

                    if (passed) {
                        testsPassed++
                        console.log(`  ✓ 测试 ${testsRun} 通过`)
                    } else {
                        testsFailed++
                        console.log(`  ✗ 测试 ${testsRun} 失败`)
                        console.log(`    有done: ${hasDoneEvent}, done是最后: ${isDoneLastEvent}`)
                        console.log(`    done后无content: ${noContentAfterDone}`)
                        console.log(`    事件序列: ${response.events.map(e => e.type).join(' -> ')}`)
                    }

                    return passed
                } catch (error) {
                    testsFailed++
                    console.log(`  ✗ 测试 ${testsRun} 异常: ${error.message}`)
                    return false
                }
            }),
            { numRuns: 5, verbose: false }
        )
    } catch (error) {
        console.log(`\nfast-check检测到失败: ${error.message}`)
    }

    console.log(`\n测试完成: ${testsPassed} 通过, ${testsFailed} 失败 (共 ${testsRun} 次)`)
    console.log('✓ Property 12 验证完成\n')

    return testsFailed === 0
}

/**
 * 主测试函数
 */
async function runPropertyTests() {
    console.log('开始SSE流式响应属性测试...')
    console.log('使用fast-check进行基于属性的测试')
    console.log('每个属性将运行5次迭代\n')

    try {
        console.log('等待服务器启动...')
        await waitForServer()
        console.log('服务器已就绪\n')

        const property11Passed = await testProperty11_SSEResponseFormat()
        const property12Passed = await testProperty12_SSEStreamEndMarker()

        if (property11Passed && property12Passed) {
            console.log('✅ 所有属性测试通过！')
            process.exit(0)
        } else {
            console.log('⚠️ 部分属性测试失败')
            process.exit(1)
        }
    } catch (error) {
        console.error('❌ 属性测试失败:', error.message)
        console.error(error.stack)
        process.exit(1)
    }
}

runPropertyTests()
