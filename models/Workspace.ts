import { initDB, createModel } from 'lyzr-architect'
let _model: any = null
export default async function getWorkspaceModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Workspace', {
      name: { type: String, required: true },
      owner_id: { type: String, required: true },
      style_guide_ref: { type: String },
      members: [{ user_id: String, role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'editor' } }]
    })
  }
  return _model
}
