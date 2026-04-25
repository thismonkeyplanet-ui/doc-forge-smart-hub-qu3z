import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getConversationModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Conversation', {
      workspace_id: String,
      messages: [{ role: String, content: String, timestamp: { type: Date, default: Date.now } }]
    })
  }
  return _model
}
