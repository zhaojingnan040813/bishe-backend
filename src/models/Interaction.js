import mongoose from 'mongoose'

const interactionSchema = new mongoose.Schema(
  {
    drug1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drug',
      required: [true, '药物1 ID不能为空'],
      index: true,
    },
    drug2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drug',
      required: [true, '药物2 ID不能为空'],
      index: true,
    },
    drug1Name: {
      type: String,
      required: [true, '药物1名称不能为空'],
      trim: true,
    },
    drug2Name: {
      type: String,
      required: [true, '药物2名称不能为空'],
      trim: true,
    },
    interactionType: {
      type: String,
      required: [true, '相互作用类型不能为空'],
      trim: true,
    },
    severity: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: '严重程度必须是 low, medium 或 high',
      },
      required: [true, '严重程度不能为空'],
      index: true,
    },
    description: {
      type: String,
      required: [true, '相互作用描述不能为空'],
      trim: true,
    },
    recommendation: {
      type: String,
      required: [true, '建议不能为空'],
      trim: true,
    },
    source: {
      type: String,
      enum: {
        values: ['database', 'ai'],
        message: '数据来源必须是 database 或 ai',
      },
      required: [true, '数据来源不能为空'],
      default: 'database',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// 复合索引：确保同一对药物的相互作用唯一性（双向）
interactionSchema.index({ drug1Id: 1, drug2Id: 1 }, { unique: true })

// 复合索引：支持反向查询
interactionSchema.index({ drug2Id: 1, drug1Id: 1 })

// 复合索引：按严重程度和来源查询
interactionSchema.index({ severity: 1, source: 1 })

// 保存前验证：确保drug1Id和drug2Id不相同
interactionSchema.pre('save', function (next) {
  if (this.drug1Id.equals(this.drug2Id)) {
    next(new Error('药物不能与自身产生相互作用'))
  } else {
    next()
  }
})

// 静态方法：查找两种药物之间的相互作用（双向查询）
interactionSchema.statics.findBetweenDrugs = function (drugId1, drugId2) {
  return this.findOne({
    $or: [
      { drug1Id: drugId1, drug2Id: drugId2 },
      { drug1Id: drugId2, drug2Id: drugId1 },
    ],
  })
}

// 静态方法：查找某药物的所有相互作用
interactionSchema.statics.findByDrugId = function (drugId) {
  return this.find({
    $or: [{ drug1Id: drugId }, { drug2Id: drugId }],
  })
}

// 静态方法：按严重程度查询
interactionSchema.statics.findBySeverity = function (severity) {
  return this.find({ severity })
}

// 实例方法：检查是否为AI生成的数据
interactionSchema.methods.isAIGenerated = function () {
  return this.source === 'ai'
}

// 实例方法：获取相互作用涉及的药物ID数组
interactionSchema.methods.getDrugIds = function () {
  return [this.drug1Id, this.drug2Id]
}

const Interaction = mongoose.model('Interaction', interactionSchema)

export default Interaction
