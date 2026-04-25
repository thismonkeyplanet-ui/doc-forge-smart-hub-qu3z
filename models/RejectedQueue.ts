import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getRejectedQueueModel() {
  if (!_model) {
    await initDB()
    _model = createModel('RejectedQueue', {
      document_id: String,
      user_id: String,
      diff_snapshot: Object,
      original_input: String
    })
  }
  return _model
}
