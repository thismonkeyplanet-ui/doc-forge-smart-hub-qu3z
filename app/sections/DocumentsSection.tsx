'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { FiPlus, FiFileText, FiChevronRight, FiX, FiTrash2, FiLoader, FiTag, FiCalendar, FiEdit2, FiSave, FiCheck, FiLink, FiGlobe, FiExternalLink, FiUpload } from 'react-icons/fi'
import { uploadAndTrainDocument } from '@/lib/ragKnowledgeBase'

interface Section {
  title: string
  content: string
  order: number
}

interface Document {
  _id: string
  title: string
  sections: Section[]
  tags: string[]
  is_locked: boolean
  workspace_id: string
  source_url?: string
  createdAt?: string
  updatedAt?: string
}

type CreateMode = 'manual' | 'url' | 'upload'

export default function DocumentsSection() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('manual')

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editSections, setEditSections] = useState<{ title: string; content: string }[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Create form state (manual)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [sections, setSections] = useState<{ title: string; content: string }[]>([
    { title: '', content: '' }
  ])

  // Create form state (URL import)
  const [importUrl, setImportUrl] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)

  // Create form state (file upload)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const uploadFileRef = useRef<HTMLInputElement>(null)
  const DOC_LIBRARY_RAG_ID = '69ec5d3fc73c0e5666b5222a'

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setDocuments(json.data)
      } else {
        setError(json.error || 'Failed to load documents')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  function startEditing() {
    if (!selectedDoc) return
    setEditTitle(selectedDoc.title)
    setEditTags(Array.isArray(selectedDoc.tags) ? selectedDoc.tags.join(', ') : '')
    setEditSections(
      Array.isArray(selectedDoc.sections)
        ? selectedDoc.sections
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(s => ({ title: s.title || '', content: s.content || '' }))
        : [{ title: '', content: '' }]
    )
    setEditing(true)
    setSaveSuccess(false)
  }

  function cancelEditing() {
    setEditing(false)
    setError(null)
  }

  function addEditSection() {
    setEditSections(prev => [...prev, { title: '', content: '' }])
  }

  function removeEditSection(idx: number) {
    setEditSections(prev => prev.filter((_, i) => i !== idx))
  }

  function updateEditSection(idx: number, field: 'title' | 'content', value: string) {
    setEditSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    if (!selectedDoc || !editTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        title: editTitle.trim(),
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        sections: editSections
          .filter(s => s.title.trim() || s.content.trim())
          .map((s, i) => ({ title: s.title, content: s.content, order: i })),
      }
      const res = await fetch(`/api/documents/${selectedDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        const updated = json.data
        setSelectedDoc(updated)
        setEditing(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
        setDocuments(prev => prev.map(d => d._id === updated._id ? updated : d))
      } else {
        setError(json.error || 'Failed to save document')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save document')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!selectedDoc) return
    try {
      const res = await fetch(`/api/documents/${selectedDoc._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setSelectedDoc(null)
        setEditing(false)
        fetchDocuments()
      } else {
        setError(json.error || 'Failed to delete document')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document')
    }
  }

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    try {
      const body = {
        workspace_id: 'default',
        title: title.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        sections: sections
          .filter(s => s.title.trim() || s.content.trim())
          .map((s, i) => ({ title: s.title, content: s.content, order: i })),
      }
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        resetCreateForm()
        fetchDocuments()
      } else {
        setError(json.error || 'Failed to create document')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create document')
    }
    setCreating(false)
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) return
    setCreating(true)
    setImportStatus('Fetching content from URL...')
    setError(null)
    try {
      const res = await fetch('/api/documents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: importUrl.trim(),
          title: importTitle.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setImportStatus('Document imported successfully')
        setTimeout(() => {
          resetCreateForm()
          fetchDocuments()
        }, 1000)
      } else {
        setError(json.error || 'Failed to import from URL')
        setImportStatus(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import from URL')
      setImportStatus(null)
    }
    setCreating(false)
  }

  async function handleFileUpload() {
    if (!uploadFile) return
    setCreating(true)
    setUploadStatus('Uploading file...')
    setError(null)
    try {
      const res = await uploadAndTrainDocument(DOC_LIBRARY_RAG_ID, uploadFile)
      if (res.success) {
        setUploadStatus('File uploaded and trained successfully')
        setTimeout(() => {
          resetCreateForm()
          fetchDocuments()
        }, 1000)
      } else {
        setError(res.error || 'Failed to upload file')
        setUploadStatus(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
      setUploadStatus(null)
    }
    setCreating(false)
  }

  function resetCreateForm() {
    setTitle('')
    setTags('')
    setSections([{ title: '', content: '' }])
    setImportUrl('')
    setImportTitle('')
    setImportStatus(null)
    setUploadFile(null)
    setUploadStatus(null)
    setUploadDragOver(false)
    setShowCreate(false)
    setCreateMode('manual')
    setError(null)
  }

  function addSection() {
    setSections(prev => [...prev, { title: '', content: '' }])
  }

  function removeSection(idx: number) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSection(idx: number, field: 'title' | 'content', value: string) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  // Detail view (read-only or edit mode)
  if (selectedDoc) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setSelectedDoc(null); setEditing(false) }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <FiChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back to documents
          </button>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <FiCheck className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {!editing ? (
              <>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 border border-red-100 rounded-md hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiSave className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}

        {editing ? (
          /* ---- EDIT MODE ---- */
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="e.g. api, guide, internal"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-600">Sections</label>
                <button
                  type="button"
                  onClick={addEditSection}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <FiPlus className="w-3 h-3" />
                  Add Section
                </button>
              </div>
              <div className="space-y-3">
                {editSections.map((s, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 relative group">
                    {editSections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditSection(i)}
                        className="absolute top-3 right-3 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={s.title}
                      onChange={e => updateEditSection(i, 'title', e.target.value)}
                      placeholder="Section title"
                      className="w-full px-2 py-1.5 border border-gray-100 rounded text-sm font-medium mb-2 focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-200"
                    />
                    <textarea
                      value={s.content}
                      onChange={e => updateEditSection(i, 'content', e.target.value)}
                      placeholder="Section content..."
                      rows={6}
                      className="w-full px-2 py-1.5 border border-gray-100 rounded text-sm resize-y focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-200 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ---- READ MODE ---- */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{selectedDoc.title}</h2>
              {selectedDoc.source_url && (
                <a
                  href={selectedDoc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
                >
                  <FiExternalLink className="w-3 h-3" />
                  Source: {selectedDoc.source_url}
                </a>
              )}
              {selectedDoc.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedDoc.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">
                      <FiTag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {selectedDoc.updatedAt && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <FiCalendar className="w-3 h-3" />
                  Last updated {formatDate(selectedDoc.updatedAt)}
                </p>
              )}
            </div>

            {Array.isArray(selectedDoc.sections) && selectedDoc.sections.length > 0 ? (
              <div className="space-y-6">
                {selectedDoc.sections
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((section, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-4">
                      {section.title && (
                        <h3 className="text-sm font-medium text-gray-800 mb-2">{section.title}</h3>
                      )}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {section.content || 'No content'}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">This document has no sections.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your central document library -- create, edit, and organize everything in one place</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          New Document
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Create Document Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Create New Document</h3>
              <button onClick={resetCreateForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setCreateMode('manual')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  createMode === 'manual'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FiEdit2 className="w-3.5 h-3.5" />
                Write Manually
              </button>
              <button
                onClick={() => setCreateMode('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  createMode === 'url'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FiGlobe className="w-3.5 h-3.5" />
                Import from URL
              </button>
              <button
                onClick={() => setCreateMode('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  createMode === 'upload'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FiUpload className="w-3.5 h-3.5" />
                Upload File
              </button>
            </div>

            {createMode === 'manual' ? (
              /* ---- Manual Create ---- */
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="e.g. api, guide, internal"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-600">Sections</label>
                    <button
                      type="button"
                      onClick={addSection}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <FiPlus className="w-3 h-3" />
                      Add Section
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sections.map((s, i) => (
                      <div key={i} className="border border-gray-100 rounded-md p-3 relative">
                        {sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(i)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input
                          type="text"
                          value={s.title}
                          onChange={e => updateSection(i, 'title', e.target.value)}
                          placeholder="Section title"
                          className="w-full px-2 py-1.5 border border-gray-100 rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-gray-200"
                        />
                        <textarea
                          value={s.content}
                          onChange={e => updateSection(i, 'content', e.target.value)}
                          placeholder="Section content..."
                          rows={3}
                          className="w-full px-2 py-1.5 border border-gray-100 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : createMode === 'url' ? (
              /* ---- URL Import ---- */
              <div className="px-5 py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Import content from any public URL, Google Docs (published), or online document. A local copy will be saved as a new document.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Document URL</label>
                  <div className="relative">
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="url"
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      placeholder="https://docs.google.com/... or any URL"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Supports any public webpage, Google Docs (File &gt; Share &gt; Publish to web), and direct document links</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={e => setImportTitle(e.target.value)}
                    placeholder="Leave blank to auto-detect from URL"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                  />
                </div>
                {importStatus && (
                  <div className={`flex items-center gap-2 text-xs ${importStatus.includes('success') ? 'text-green-600' : 'text-gray-500'}`}>
                    {!importStatus.includes('success') && <FiLoader className="w-3 h-3 animate-spin" />}
                    {importStatus.includes('success') && <FiCheck className="w-3 h-3" />}
                    {importStatus}
                  </div>
                )}
              </div>
            ) : (
              /* ---- File Upload ---- */
              <div className="px-5 py-4 space-y-4">
                <input
                  type="file"
                  ref={uploadFileRef}
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setUploadFile(f)
                    if (uploadFileRef.current) uploadFileRef.current.value = ''
                  }}
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true) }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setUploadDragOver(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) setUploadFile(f)
                  }}
                  onClick={() => uploadFileRef.current?.click()}
                  className={`w-full py-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                    uploadDragOver
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <FiUpload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {uploadDragOver ? 'Drop file here' : 'Click to select or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">Supports PDF, DOCX, TXT</p>
                </div>

                {uploadFile && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-md border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <FiFileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{uploadFile.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {(uploadFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadStatus(null) }}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {uploadStatus && (
                  <div className={`flex items-center gap-2 text-xs ${uploadStatus.includes('success') ? 'text-green-600' : 'text-gray-500'}`}>
                    {!uploadStatus.includes('success') && <FiLoader className="w-3 h-3 animate-spin" />}
                    {uploadStatus.includes('success') && <FiCheck className="w-3 h-3" />}
                    {uploadStatus}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <button
                onClick={resetCreateForm}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              {createMode === 'manual' ? (
                <button
                  onClick={handleCreate}
                  disabled={creating || !title.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <FiLoader className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? 'Creating...' : 'Create'}
                </button>
              ) : createMode === 'url' ? (
                <button
                  onClick={handleImportUrl}
                  disabled={creating || !importUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <FiLoader className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? 'Importing...' : 'Import & Save'}
                </button>
              ) : (
                <button
                  onClick={handleFileUpload}
                  disabled={creating || !uploadFile}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <FiLoader className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? 'Uploading...' : 'Upload & Train'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <FiLoader className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <FiFileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No documents yet</p>
          <p className="text-xs text-gray-300 mt-1">Create your first document to get started</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {documents.map(doc => (
            <button
              key={doc._id}
              onClick={() => setSelectedDoc(doc)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50/50 transition-all text-left group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <FiFileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                    {doc.source_url && <FiLink className="w-3 h-3 text-blue-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.updatedAt && (
                      <span className="text-xs text-gray-400">{formatDate(doc.updatedAt)}</span>
                    )}
                    {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                      <span className="text-xs text-gray-300">
                        {doc.tags.slice(0, 3).join(', ')}
                        {doc.tags.length > 3 && ` +${doc.tags.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
