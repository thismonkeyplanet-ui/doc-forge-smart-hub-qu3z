import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getDocumentModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Document', {
      workspace_id: { type: String, required: true },
      title: { type: String, required: true },
      sections: [{ title: String, content: String, order: Number }],
      tags: [String],
      is_locked: { type: Boolean, default: false },
      updated_by: String
    })
  }
  return _model
}
