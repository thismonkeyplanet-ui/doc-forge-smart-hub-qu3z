import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getPublishedLinkModel() {
  if (!_model) {
    await initDB()
    _model = createModel('PublishedLink', {
      workspace_id: String,
      document_id: String,
      url: { type: String, required: true },
      last_checked: Date,
      drift_status: { type: String, enum: ['synced', 'drifted', 'unchecked'], default: 'unchecked' }
    })
  }
  return _model
}
