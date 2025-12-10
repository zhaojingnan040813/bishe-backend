import mongoose from 'mongoose'

const drugSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '药物名称不能为空'],
      trim: true,
      unique: true,
      index: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, '药物描述不能为空'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, '药物分类不能为空'],
      trim: true,
      index: true,
    },
    sideEffects: {
      type: [String],
      default: [],
    },
    contraindications: {
      type: [String],
      default: [],
    },
    dosage: {
      type: String,
      trim: true,
    },
    aiAnalysis: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['manual', 'ai'],
      required: [true, '数据来源不能为空'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// 复合索引：支持按名称和分类查询
drugSchema.index({ name: 1, category: 1 })

// 文本索引：支持全文搜索
drugSchema.index({ name: 'text', genericName: 'text', description: 'text' })

// 实例方法：检查是否为AI生成的数据
drugSchema.methods.isAIGenerated = function () {
  return this.source === 'ai'
}

// 静态方法：按名称模糊搜索
drugSchema.statics.searchByName = function (searchTerm) {
  const regex = new RegExp(searchTerm, 'i')
  return this.find({
    $or: [{ name: regex }, { genericName: regex }],
  })
}

// 静态方法：按分类查询
drugSchema.statics.findByCategory = function (category) {
  return this.find({ category })
}

const Drug = mongoose.model('Drug', drugSchema)

export default Drug
