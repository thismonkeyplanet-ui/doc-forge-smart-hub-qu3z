'use client'

import React, { useState, useEffect } from 'react'
import { AuthProvider, ProtectedRoute, LoginForm, RegisterForm } from 'lyzr-architect/client'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'

import SidebarSection from './SidebarSection'
import ProcessNotesSection from './ProcessNotesSection'
import { SAMPLE_RESULT } from './ProcessNotesSection'
import type { Change } from './ProcessNotesSection'
import SearchSection from './SearchSection'
import PublishingSyncSection from './PublishingSyncSection'
import KnowledgeBaseSection from './KnowledgeBaseSection'
import AuditTrailSection from './AuditTrailSection'
import DocumentsSection from './DocumentsSection'
import ReviewPanel, { ReviewTrigger } from './ReviewPanel'
import WelcomeIntro from './WelcomeIntro'

const PIPELINE_MANAGER_ID = '69ec5dbe526b35c560a7eb30'
const LIBRARY_SEARCH_ID = '69ec5d9ec7fa6fc6ca0787e3'
const PUBLISHING_SYNC_ID = '69ec5d70a75829ff9acd7620'

const AGENTS = [
  { id: PIPELINE_MANAGER_ID, name: 'Change Processor', purpose: 'Processes notes into updates' },
  { id: LIBRARY_SEARCH_ID, name: 'Doc Search', purpose: 'Searches your documents' },
  { id: PUBLISHING_SYNC_ID, name: 'Link Monitor', purpose: 'Checks published links' },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 transition-colors">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900">DocFlow</h1>
          <p className="text-xs text-gray-400 mt-1">Documentation Hub</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppContent() {
  const [activeTab, setActiveTab] = useState('documents')
  const [sampleMode, setSampleMode] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [showIntro, setShowIntro] = useState(false)

  // Show intro on first visit
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('docflow_intro_seen')
    if (!hasSeenIntro) {
      setShowIntro(true)
    }
  }, [])

  function handleDismissIntro() {
    setShowIntro(false)
    localStorage.setItem('docflow_intro_seen', '1')
  }

  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [pipelineResult, setPipelineResult] = useState<any>(null)

  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)

  const [driftLoading, setDriftLoading] = useState(false)
  const [driftResult, setDriftResult] = useState<any>(null)

  // Review panel state
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false)
  const [decisions, setDecisions] = useState<Record<number, 'approved' | 'rejected'>>({})

  // Get current changes for the review panel
  const displayResult = sampleMode ? SAMPLE_RESULT : pipelineResult
  const currentChanges: Change[] = Array.isArray(displayResult?.changes) ? displayResult.changes : []
  const pendingCount = currentChanges.filter((_, i) => !decisions[i]).length

  // Auto-open review panel when new changes arrive
  useEffect(() => {
    if (currentChanges.length > 0) {
      setReviewPanelOpen(true)
      setDecisions({})
    }
  }, [pipelineResult, sampleMode])

  async function handleProcessNotes(notes: string) {
    if (!notes.trim()) return
    setPipelineLoading(true)
    setActiveAgentId(PIPELINE_MANAGER_ID)
    setDecisions({})
    try {
      const result = await callAIAgent(notes, PIPELINE_MANAGER_ID)
      if (result.success) {
        const parsed = parseLLMJson(result.response)
        const data = parsed?.result ?? parsed ?? {}
        setPipelineResult(data)
      }
    } catch (err) {
      console.error('Pipeline processing failed:', err)
    }
    setPipelineLoading(false)
    setActiveAgentId(null)
  }

  async function handleApproveChange(change: Change, index: number) {
    setDecisions(prev => ({ ...prev, [index]: 'approved' }))
    try {
      const res = await fetch('/api/changelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: change.document ?? 'Unknown',
          diff_snapshot: change,
          action: 'approved',
        }),
      })
      if (!res.ok) console.error('Failed to save approval:', res.statusText)
      await applyChangeToDocument(change)
    } catch (err) {
      console.error('Failed to approve change:', err)
    }
  }

  async function handleRejectChange(change: Change, index: number) {
    setDecisions(prev => ({ ...prev, [index]: 'rejected' }))
    try {
      const results = await Promise.all([
        fetch('/api/changelogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: change.document ?? 'Unknown',
            diff_snapshot: change,
            action: 'rejected',
          }),
        }),
        fetch('/api/rejected-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: change.document ?? 'Unknown',
            diff_snapshot: change,
            original_input: '',
          }),
        }),
      ])
      results.forEach((res, i) => {
        if (!res.ok) console.error(`Failed to save rejection (call ${i}):`, res.statusText)
      })
    } catch (err) {
      console.error('Failed to reject change:', err)
    }
  }

  async function applyChangeToDocument(change: Change) {
    if (!change.document) return
    try {
      const docsRes = await fetch(`/api/documents?q=${encodeURIComponent(change.document)}`)
      const docsJson = await docsRes.json()
      let doc: any = null

      if (docsJson.success && Array.isArray(docsJson.data) && docsJson.data.length > 0) {
        doc = docsJson.data.find((d: any) => d.title === change.document) || docsJson.data[0]
      }

      if (!doc) {
        if (change.change_type !== 'deletion' && change.after) {
          await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspace_id: 'default',
              title: change.document,
              sections: [{ title: change.section || 'General', content: change.after, order: 0 }],
              tags: [],
            }),
          })
        }
        return
      }

      const sections = Array.isArray(doc.sections) ? [...doc.sections] : []
      const sectionName = change.section || 'General'

      if (change.change_type === 'deletion') {
        const updatedSections = sections.filter((s: any) => s.title !== sectionName)
        await fetch(`/api/documents/${doc._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: updatedSections }),
        })
      } else {
        const existingIdx = sections.findIndex((s: any) => s.title === sectionName)
        if (existingIdx >= 0) {
          sections[existingIdx] = { ...sections[existingIdx], content: change.after || sections[existingIdx].content }
        } else {
          sections.push({ title: sectionName, content: change.after || '', order: sections.length })
        }
        await fetch(`/api/documents/${doc._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections }),
        })
      }
    } catch (docErr) {
      console.error('Failed to update document with approved change:', docErr)
    }
  }

  async function handleApproveAll() {
    const pending = currentChanges
      .map((change, idx) => ({ change, idx }))
      .filter(({ idx }) => !decisions[idx])

    const newDecisions = { ...decisions }
    pending.forEach(({ idx }) => { newDecisions[idx] = 'approved' })
    setDecisions(newDecisions)

    try {
      await Promise.all(
        pending.map(async ({ change }) => {
          await fetch('/api/changelogs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_id: change.document ?? 'Unknown',
              diff_snapshot: change,
              action: 'approved',
            }),
          })
          await applyChangeToDocument(change)
        })
      )
    } catch (err) {
      console.error('Failed to approve all:', err)
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) return
    setSearchLoading(true)
    setActiveAgentId(LIBRARY_SEARCH_ID)
    try {
      const result = await callAIAgent(query, LIBRARY_SEARCH_ID)
      if (result.success) {
        const parsed = parseLLMJson(result.response)
        const data = parsed?.result ?? parsed ?? {}
        setSearchResult(data)
      }
    } catch (err) {
      console.error('Search failed:', err)
    }
    setSearchLoading(false)
    setActiveAgentId(null)
  }

  async function handleCheckDrift(links: any[]) {
    if (!links.length) return
    setDriftLoading(true)
    setActiveAgentId(PUBLISHING_SYNC_ID)
    try {
      const urlData = links.map((l: any) => ({
        url: l.url ?? '',
        internal_document: l.document_id ?? '',
      }))
      const message = `Check drift for URLs: ${JSON.stringify(urlData)}`
      const result = await callAIAgent(message, PUBLISHING_SYNC_ID)
      if (result.success) {
        const parsed = parseLLMJson(result.response)
        const data = parsed?.result ?? parsed ?? {}
        setDriftResult(data)
      }
    } catch (err) {
      console.error('Drift check failed:', err)
    }
    setDriftLoading(false)
    setActiveAgentId(null)
  }

  async function handleReprocess(entry: any) {
    if (entry.original_input) {
      setActiveTab('process')
      await handleProcessNotes(entry.original_input)
    }
  }

  return (
    <AuthProvider>
      <ErrorBoundary>
        <ProtectedRoute unauthenticatedFallback={<AuthScreen />}>
          <div className="min-h-screen flex bg-white">
            <SidebarSection activeTab={activeTab} setActiveTab={setActiveTab} sampleMode={sampleMode} setSampleMode={setSampleMode} onShowIntro={() => setShowIntro(true)} />

            <div className="flex-1 flex flex-col min-h-screen">
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-8 py-10">
                  {activeTab === 'documents' && (
                    <DocumentsSection />
                  )}
                  {activeTab === 'process' && (
                    <ProcessNotesSection sampleMode={sampleMode} loading={pipelineLoading} pipelineResult={pipelineResult} onProcess={handleProcessNotes} onApprove={handleApproveChange} onReject={handleRejectChange} activeAgentId={activeAgentId} decisions={decisions} />
                  )}
                  {activeTab === 'search' && (
                    <SearchSection sampleMode={sampleMode} loading={searchLoading} searchResult={searchResult} onSearch={handleSearch} activeAgentId={activeAgentId} />
                  )}
                  {activeTab === 'sync' && (
                    <PublishingSyncSection sampleMode={sampleMode} loading={driftLoading} driftResult={driftResult} onCheckDrift={handleCheckDrift} activeAgentId={activeAgentId} />
                  )}
                  {activeTab === 'kb' && (
                    <KnowledgeBaseSection sampleMode={sampleMode} />
                  )}
                  {activeTab === 'audit' && (
                    <AuditTrailSection sampleMode={sampleMode} onReprocess={handleReprocess} />
                  )}
                </div>
              </main>

              <footer className="border-t border-gray-100 px-8 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {AGENTS.map(agent => (
                      <div key={agent.id} className="flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-400">{agent.name}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-300">DocFlow</span>
                </div>
              </footer>
            </div>
          </div>

          {currentChanges.length > 0 && !reviewPanelOpen && (
            <ReviewTrigger
              count={currentChanges.length}
              pendingCount={pendingCount}
              onClick={() => setReviewPanelOpen(true)}
            />
          )}

          <ReviewPanel
            changes={currentChanges}
            open={reviewPanelOpen}
            onClose={() => setReviewPanelOpen(false)}
            onApprove={handleApproveChange}
            onReject={handleRejectChange}
            onApproveAll={handleApproveAll}
            decisions={decisions}
          />

          {showIntro && <WelcomeIntro onDismiss={handleDismissIntro} />}
        </ProtectedRoute>
      </ErrorBoundary>
    </AuthProvider>
  )
}
