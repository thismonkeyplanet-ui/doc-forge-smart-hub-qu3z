'use client'

import { useState, useEffect, useRef } from 'react'
import { FiCheck, FiX, FiClock, FiRotateCcw, FiTrash2, FiUpload, FiFile, FiPaperclip } from 'react-icons/fi'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'

interface ChangeLogEntry {
  _id?: string
  document_id?: string
  user_id?: string
  diff_snapshot?: any
  action?: string
  createdAt?: string
}

interface RejectedEntry {
  _id?: string
  document_id?: string
  user_id?: string
  diff_snapshot?: any
  original_input?: string
  createdAt?: string
}

interface UploadedEvidence {
  fileName: string
  uploadedAt: string
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface AuditTrailSectionProps {
  sampleMode: boolean
  onReprocess: (entry: RejectedEntry) => void
}

const SAMPLE_CHANGELOGS: ChangeLogEntry[] = [
  { _id: '1', document_id: 'API Reference', action: 'approved', diff_snapshot: { section: 'Authentication', change_type: 'modification', summary: 'Updated auth from API keys to OAuth 2.0' }, createdAt: '2026-04-24T10:30:00Z' },
  { _id: '2', document_id: 'Deployment Guide', action: 'approved', diff_snapshot: { section: 'Kubernetes Setup', change_type: 'addition', summary: 'Added Kubernetes deployment section' }, createdAt: '2026-04-24T10:31:00Z' },
  { _id: '3', document_id: 'API Reference', action: 'rejected', diff_snapshot: { section: 'Rate Limiting', change_type: 'modification', summary: 'Rate limit change from 100 to 500' }, createdAt: '2026-04-24T10:32:00Z' },
]

const SAMPLE_REJECTED: RejectedEntry[] = [
  { _id: '1', document_id: 'API Reference', diff_snapshot: { section: 'Rate Limiting', change_type: 'modification', before: '100 requests/min', after: '500 requests/min', summary: 'Rate limit change from 100 to 500' }, original_input: 'Changed the rate limiting policy from 100 to 500 requests per minute', createdAt: '2026-04-24T10:32:00Z' },
]

function actionIcon(action?: string) {
  switch (action) {
    case 'approved': return <FiCheck className="w-3.5 h-3.5 text-green-500" />
    case 'rejected': return <FiX className="w-3.5 h-3.5 text-red-400" />
    default: return <FiClock className="w-3.5 h-3.5 text-amber-500" />
  }
}

const DOC_LIBRARY_RAG_ID = '69ec5d3fc73c0e5666b5222a'

export default function AuditTrailSection({ sampleMode, onReprocess }: AuditTrailSectionProps) {
  const [changelogs, setChangelogs] = useState<ChangeLogEntry[]>([])
  const [rejected, setRejected] = useState<RejectedEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [tab, setTab] = useState<'changelogs' | 'rejected' | 'evidence'>('changelogs')

  const [evidenceFiles, setEvidenceFiles] = useState<UploadedEvidence[]>([])
  const [dragOver, setDragOver] = useState(false)
  const evidenceFileRef = useRef<HTMLInputElement>(null)

  const displayLogs = sampleMode ? SAMPLE_CHANGELOGS : changelogs
  const displayRejected = sampleMode ? SAMPLE_REJECTED : rejected
  const filteredLogs = filter === 'all' ? displayLogs : displayLogs.filter(l => l.action === filter)

  useEffect(() => {
    if (!sampleMode) fetchData()
  }, [sampleMode])

  async function fetchData() {
    setLoading(true)
    try {
      const [logRes, rejRes] = await Promise.all([
        fetch('/api/changelogs').then(r => r.json()),
        fetch('/api/rejected-queue').then(r => r.json()),
      ])
      if (logRes.success && Array.isArray(logRes.data)) setChangelogs(logRes.data)
      if (rejRes.success && Array.isArray(rejRes.data)) setRejected(rejRes.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function removeRejected(id: string) {
    try {
      await fetch(`/api/rejected-queue?id=${id}`, { method: 'DELETE' })
      fetchData()
    } catch { /* ignore */ }
  }

  async function handleEvidenceUpload(files: FileList | File[]) {
    const fileArray = Array.from(files)
    for (const file of fileArray) {
      const entry: UploadedEvidence = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
      }
      setEvidenceFiles(prev => [entry, ...prev])

      try {
        const res = await uploadAndTrainDocument(DOC_LIBRARY_RAG_ID, file)
        setEvidenceFiles(prev =>
          prev.map(e =>
            e.fileName === file.name && e.status === 'uploading'
              ? { ...e, status: res.success ? 'success' : 'error', error: res.error }
              : e
          )
        )
      } catch {
        setEvidenceFiles(prev =>
          prev.map(e =>
            e.fileName === file.name && e.status === 'uploading'
              ? { ...e, status: 'error', error: 'Upload failed' }
              : e
          )
        )
      }
    }
  }

  function handleEvidenceDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleEvidenceUpload(e.dataTransfer.files)
    }
  }

  function formatDate(d?: string) {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Activity Log</h2>
        <p className="text-sm text-gray-400">View the full history of approved and rejected changes, reprocess items, and upload supporting evidence.</p>
      </div>

      <div className="flex items-center gap-6 border-b border-gray-100 pb-0">
        <button onClick={() => setTab('changelogs')} className={`pb-2.5 text-sm border-b-2 transition-colors ${tab === 'changelogs' ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Change Logs
        </button>
        <button onClick={() => setTab('rejected')} className={`pb-2.5 text-sm border-b-2 transition-colors ${tab === 'rejected' ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Rejected Queue ({displayRejected.length})
        </button>
        <button onClick={() => setTab('evidence')} className={`pb-2.5 text-sm border-b-2 transition-colors ${tab === 'evidence' ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Evidence Upload
        </button>
      </div>

      {tab === 'changelogs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'approved', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-xs text-gray-300 text-center py-8">Loading...</p>
          ) : filteredLogs.length > 0 ? (
            <div className="border-t border-gray-100">
              {filteredLogs.map((log, idx) => (
                <div key={log._id ?? idx} className="flex items-center gap-3 py-3 border-b border-gray-100">
                  {actionIcon(log.action)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{log.document_id ?? 'Unknown'}</span>
                      <span className="text-xs text-gray-300">{log.diff_snapshot?.section ?? ''}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{log.diff_snapshot?.summary ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs ${log.action === 'approved' ? 'text-green-500' : log.action === 'rejected' ? 'text-red-400' : 'text-gray-400'}`}>{log.action ?? 'unknown'}</span>
                    <span className="text-xs text-gray-300">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 text-center py-12">No change logs yet.</p>
          )}
        </div>
      )}

      {tab === 'rejected' && (
        <div>
          {displayRejected.length > 0 ? (
            <div className="border-t border-gray-100">
              {displayRejected.map((entry, idx) => (
                <div key={entry._id ?? idx} className="py-5 border-b border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">{entry.document_id ?? 'Unknown Document'}</span>
                    <span className="text-xs text-gray-300">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-400">{entry.diff_snapshot?.summary ?? ''}</p>
                  {entry.original_input && (
                    <div className="pl-4 border-l-2 border-gray-200">
                      <p className="text-xs text-gray-500">{entry.original_input}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => onReprocess(entry)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                      <FiRotateCcw className="w-3 h-3" /> Re-process
                    </button>
                    {!sampleMode && (
                      <button onClick={() => removeRejected(entry._id ?? '')} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                        <FiTrash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 text-center py-12">No rejected items.</p>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div className="space-y-4">
          <input
            type="file"
            ref={evidenceFileRef}
            className="hidden"
            accept=".pdf,.docx,.txt"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleEvidenceUpload(e.target.files)
              }
              if (evidenceFileRef.current) evidenceFileRef.current.value = ''
            }}
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleEvidenceDrop}
            onClick={() => !sampleMode && evidenceFileRef.current?.click()}
            className={`w-full py-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
            } ${sampleMode ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <FiUpload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {dragOver ? 'Drop files here' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-gray-300 mt-1">Supports PDF, DOCX, TXT</p>
          </div>

          {evidenceFiles.length > 0 && (
            <div className="border-t border-gray-100">
              {evidenceFiles.map((ev, idx) => (
                <div key={`${ev.fileName}-${idx}`} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiPaperclip className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{ev.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ev.status === 'uploading' && (
                      <span className="text-xs text-gray-400">Uploading...</span>
                    )}
                    {ev.status === 'success' && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <FiCheck className="w-3 h-3" /> Uploaded
                      </span>
                    )}
                    {ev.status === 'error' && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <FiX className="w-3 h-3" /> {ev.error || 'Failed'}
                      </span>
                    )}
                    <span className="text-xs text-gray-300">{formatDate(ev.uploadedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {evidenceFiles.length === 0 && (
            <p className="text-sm text-gray-300 text-center py-8">No evidence files uploaded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
