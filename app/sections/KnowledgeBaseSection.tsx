'use client'

import { useState, useEffect, useRef } from 'react'
import { FiUpload, FiTrash2, FiFile, FiBookOpen } from 'react-icons/fi'
import { getDocuments, uploadAndTrainDocument, deleteDocuments } from '@/lib/ragKnowledgeBase'
import type { RAGDocument } from '@/lib/ragKnowledgeBase'

const DOC_LIBRARY_RAG_ID = '69ec5d3fc73c0e5666b5222a'
const STYLE_GUIDE_RAG_ID = '69ec5d3fe01f11b1c838378b'

interface KnowledgeBaseSectionProps {
  sampleMode: boolean
}

interface KBState {
  docs: RAGDocument[]
  loading: boolean
  uploading: boolean
  error: string
}

function KBPanel({ ragId, title, icon, sampleMode }: { ragId: string; title: string; icon: React.ReactNode; sampleMode: boolean }) {
  const [state, setState] = useState<KBState>({ docs: [], loading: false, uploading: false, error: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const sampleDocs: RAGDocument[] = [
    { fileName: 'api-reference-v3.pdf', fileType: 'pdf', status: 'active', uploadedAt: '2026-04-20' },
    { fileName: 'deployment-guide.docx', fileType: 'docx', status: 'active', uploadedAt: '2026-04-18' },
  ]

  const displayDocs = sampleMode ? sampleDocs : state.docs

  useEffect(() => {
    if (!sampleMode) loadDocs()
  }, [sampleMode])

  async function loadDocs() {
    setState(prev => ({ ...prev, loading: true, error: '' }))
    const res = await getDocuments(ragId)
    if (res.success && Array.isArray(res.documents)) {
      setState(prev => ({ ...prev, docs: res.documents ?? [], loading: false }))
    } else {
      setState(prev => ({ ...prev, loading: false, error: res.error ?? 'Failed to load' }))
    }
  }

  async function handleUpload(file: File) {
    setState(prev => ({ ...prev, uploading: true, error: '' }))
    const res = await uploadAndTrainDocument(ragId, file)
    if (res.success) {
      await loadDocs()
    } else {
      setState(prev => ({ ...prev, error: res.error ?? 'Upload failed' }))
    }
    setState(prev => ({ ...prev, uploading: false }))
  }

  async function handleDelete(fileName: string) {
    const res = await deleteDocuments(ragId, [fileName])
    if (res.success) await loadDocs()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <span className="text-xs text-gray-400">{displayDocs.length} docs</span>
      </div>

      <input type="file" ref={fileRef} className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); if (fileRef.current) fileRef.current.value = '' }} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={state.uploading || sampleMode}
        className="w-full py-3 border border-dashed border-gray-200 rounded-md text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {state.uploading ? 'Uploading...' : <><FiUpload className="w-3.5 h-3.5" /> Upload Document</>}
      </button>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      {state.loading ? (
        <p className="text-xs text-gray-300 text-center py-6">Loading documents...</p>
      ) : displayDocs.length > 0 ? (
        <div className="border-t border-gray-100">
          {displayDocs.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <FiFile className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="text-sm text-gray-700 truncate">{doc.fileName}</span>
                <span className="text-xs text-gray-300">{doc.fileType}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${doc.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                {!sampleMode && (
                  <button onClick={() => handleDelete(doc.fileName)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 text-center py-6">No documents uploaded yet.</p>
      )}
    </div>
  )
}

export default function KnowledgeBaseSection({ sampleMode }: KnowledgeBaseSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Training Library</h2>
        <p className="text-sm text-gray-400">Upload reference documents and style guides to train the AI and improve results across all features.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <KBPanel ragId={DOC_LIBRARY_RAG_ID} title="Doc Library" icon={<FiBookOpen className="w-4 h-4 text-gray-500" />} sampleMode={sampleMode} />
        <KBPanel ragId={STYLE_GUIDE_RAG_ID} title="Style Guide" icon={<FiFile className="w-4 h-4 text-gray-500" />} sampleMode={sampleMode} />
      </div>
    </div>
  )
}
