import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getChangeLogModel() {
  if (!_model) {
    await initDB()
    _model = createModel('ChangeLog', {
      document_id: { type: String, required: true },
      user_id: String,
      diff_snapshot: { type: Object },
      action: { type: String, enum: ['approved', 'rejected', 'queued'], required: true }
    })
  }
  return _model
}
