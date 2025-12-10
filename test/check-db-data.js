import { connectDB } from '../src/config/database.js'
import Interaction from '../src/models/Interaction.js'
import Drug from '../src/models/Drug.js'

async function checkData() {
  try {
    await connectDB()
    
    console.log('检查数据库中的数据...\n')
    
    // 检查药物数据
    const drugs = await Drug.find().limit(3).lean()
    console.log('药物示例:')
    console.log(JSON.stringify(drugs, null, 2))
    console.log('\n')
    
    // 检查相互作用数据
    const interactions = await Interaction.find().limit(3).lean()
    console.log('相互作用示例:')
    console.log(JSON.stringify(interactions, null, 2))
    
    process.exit(0)
  } catch (error) {
    console.error('错误:', error)
    process.exit(1)
  }
}

checkData()
