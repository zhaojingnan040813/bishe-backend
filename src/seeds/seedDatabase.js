import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Drug, Interaction } from '../models/index.js'
import { seedDrugs } from './drugData.js'
import { seedInteractions } from './interactionData.js'
import { logger } from '../utils/logger.js'

// 加载环境变量
dotenv.config()

const seedDatabase = async () => {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI
    const dbName = process.env.DB_NAME || 'drug_interaction_db'

    await mongoose.connect(mongoUri, {
      dbName: dbName,
    })

    logger.info('数据库连接成功，开始导入种子数据...')

    // 清空现有数据（可选，根据需要决定是否清空）
    const clearExisting = process.argv.includes('--clear')
    if (clearExisting) {
      await Drug.deleteMany({})
      await Interaction.deleteMany({})
      logger.info('已清空现有数据')
    }

    // 导入药物数据
    logger.info('开始导入药物数据...')
    const drugDocs = []
    for (const drugData of seedDrugs) {
      try {
        // 检查是否已存在
        const existing = await Drug.findOne({ name: drugData.name })
        if (existing) {
          logger.info(`药物 "${drugData.name}" 已存在，跳过`)
          drugDocs.push(existing)
        } else {
          const drug = await Drug.create(drugData)
          drugDocs.push(drug)
          logger.info(`成功导入药物: ${drug.name}`)
        }
      } catch (error) {
        logger.error(`导入药物 "${drugData.name}" 失败:`, error.message)
      }
    }

    logger.info(`药物数据导入完成，共 ${drugDocs.length} 条`)

    // 创建药物名称到ID的映射
    const drugNameToId = {}
    drugDocs.forEach((drug) => {
      drugNameToId[drug.name] = drug._id
    })

    // 导入相互作用数据
    logger.info('开始导入相互作用数据...')
    let interactionCount = 0
    for (const interactionData of seedInteractions) {
      try {
        const drug1Id = drugNameToId[interactionData.drug1Name]
        const drug2Id = drugNameToId[interactionData.drug2Name]

        if (!drug1Id || !drug2Id) {
          logger.warn(
            `跳过相互作用: ${interactionData.drug1Name} - ${interactionData.drug2Name} (药物不存在)`
          )
          continue
        }

        // 检查是否已存在（双向检查）
        const existing = await Interaction.findBetweenDrugs(drug1Id, drug2Id)
        if (existing) {
          logger.info(
            `相互作用 "${interactionData.drug1Name} - ${interactionData.drug2Name}" 已存在，跳过`
          )
          interactionCount++
        } else {
          const interaction = await Interaction.create({
            drug1Id,
            drug2Id,
            drug1Name: interactionData.drug1Name,
            drug2Name: interactionData.drug2Name,
            interactionType: interactionData.interactionType,
            severity: interactionData.severity,
            description: interactionData.description,
            recommendation: interactionData.recommendation,
            source: interactionData.source,
          })
          interactionCount++
          logger.info(
            `成功导入相互作用: ${interaction.drug1Name} - ${interaction.drug2Name}`
          )
        }
      } catch (error) {
        logger.error(
          `导入相互作用 "${interactionData.drug1Name} - ${interactionData.drug2Name}" 失败:`,
          error.message
        )
      }
    }

    logger.info(`相互作用数据导入完成，共 ${interactionCount} 条`)

    // 显示统计信息
    const totalDrugs = await Drug.countDocuments()
    const totalInteractions = await Interaction.countDocuments()
    const aiDrugs = await Drug.countDocuments({ source: 'ai' })
    const manualDrugs = await Drug.countDocuments({ source: 'manual' })

    logger.info('\n=== 数据库统计 ===')
    logger.info(`总药物数: ${totalDrugs}`)
    logger.info(`  - 手动录入: ${manualDrugs}`)
    logger.info(`  - AI生成: ${aiDrugs}`)
    logger.info(`总相互作用数: ${totalInteractions}`)
    logger.info('==================\n')

    logger.info('种子数据导入完成！')
  } catch (error) {
    logger.error('种子数据导入失败:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    logger.info('数据库连接已关闭')
    process.exit(0)
  }
}

// 执行种子脚本
seedDatabase()
