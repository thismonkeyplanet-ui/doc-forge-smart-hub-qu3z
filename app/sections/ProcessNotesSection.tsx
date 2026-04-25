'use client'

import { useState } from 'react'
import { FiCheck, FiX, FiArrowRight } from 'react-icons/fi'

export interface Change {
  document?: string
  section?: string
  change_type?: string
  before?: string
  after?: string
  impact?: string
  summary?: string
}

export interface PipelineResult {
  pipeline_status?: string
  changes?: Change[]
  total_changes?: number
  overall_summary?: string
  processing_notes?: string
}

interface ProcessNotesSectionProps {
  sampleMode: boolean
  loading: boolean
  pipelineResult: PipelineResult | null
  onProcess: (notes: string) => void
  onApprove: (change: Change, index: number) => void
  onReject: (change: Change, index: number) => void
  activeAgentId: string | null
  decisions: Record<number, 'approved' | 'rejected'>
}

export const SAMPLE_NOTES = `Meeting notes from Q2 planning:
- Updated the API authentication section to use OAuth 2.0 instead of API keys
- The deployment guide needs a new section for Kubernetes setup
- Removed deprecated endpoints from the REST API reference
- Changed the rate limiting policy from 100 to 500 requests per minute`

export const SAMPLE_RESULT: PipelineResult = {
  pipeline_status: 'completed',
  total_changes: 4,
  overall_summary: 'Processed 4 documentation changes across API Reference and Deployment Guide documents.',
  processing_notes: 'All changes have been validated against the style guide. Two modifications and one addition detected.',
  changes: [
    { document: 'API Reference', section: 'Authentication', change_type: 'modification', before: 'Use API keys for authentication by including your key in the X-API-Key header.', after: 'Use OAuth 2.0 for authentication. Obtain a bearer token from the /oauth/token endpoint and include it in the Authorization header.', impact: 'major', summary: 'Updated authentication method from API keys to OAuth 2.0' },
    { document: 'Deployment Guide', section: 'Kubernetes Setup', change_type: 'addition', before: '', after: 'Deploy to Kubernetes using the provided Helm chart. Configure the values.yaml for your environment and run helm install docflow ./charts/docflow.', impact: 'major', summary: 'Added new Kubernetes deployment section' },
    { document: 'API Reference', section: 'Deprecated Endpoints', change_type: 'deletion', before: 'POST /api/v1/legacy-auth\nGET /api/v1/old-status\nPUT /api/v1/migrate', after: '', impact: 'minor', summary: 'Removed deprecated legacy endpoints' },
    { document: 'API Reference', section: 'Rate Limiting', change_type: 'modification', before: 'Rate limit: 100 requests per minute per API key.', after: 'Rate limit: 500 requests per minute per OAuth token.', impact: 'minor', summary: 'Updated rate limiting from 100 to 500 requests per minute' },
  ]
}

function changeTypeDot(type?: string) {
  switch (type?.toLowerCase()) {
    case 'addition': return 'bg-green-500'
    case 'modification': return 'bg-amber-500'
    case 'deletion': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
}

export default function ProcessNotesSection({ sampleMode, loading, pipelineResult, onProcess, onApprove, onReject, decisions }: ProcessNotesSectionProps) {
  const [notes, setNotes] = useState('')

  const displayResult = sampleMode ? SAMPLE_RESULT : pipelineResult
  const changes = Array.isArray(displayResult?.changes) ? displayResult.changes : []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Change Processor</h2>
        <p className="text-sm text-gray-400">Paste raw meeting notes or changelogs and the AI will turn them into targeted document updates for your review.</p>
      </div>

      <div>
        <textarea
          placeholder="Paste your raw meeting notes, changelogs, or documentation updates here..."
          className="w-full min-h-[180px] p-4 text-sm text-gray-800 bg-white border border-gray-200 rounded-md resize-none focus:outline-none focus:border-gray-400 placeholder:text-gray-300 leading-relaxed"
          value={sampleMode ? SAMPLE_NOTES : notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          onClick={() => onProcess(sampleMode ? SAMPLE_NOTES : notes)}
          disabled={loading || (!notes.trim() && !sampleMode)}
          className="mt-3 px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Process Notes'}
        </button>
      </div>

      {displayResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{displayResult.pipeline_status ?? 'unknown'}</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">{displayResult.total_changes ?? 0} changes detected</span>
          </div>
          {displayResult.overall_summary && (
            <p className="text-sm text-gray-600 leading-relaxed">{displayResult.overall_summary}</p>
          )}
          {displayResult.processing_notes && (
            <p className="text-sm text-gray-400 leading-relaxed">{displayResult.processing_notes}</p>
          )}
        </div>
      )}

      {changes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Diff Preview</h3>
            <p className="text-xs text-gray-400">Use the review panel on the right to approve or reject changes</p>
          </div>
          <div className="space-y-0 border-t border-gray-100">
            {changes.map((change, idx) => {
              const decided = decisions[idx]
              return (
                <div key={idx} className={`py-5 border-b border-gray-100 ${decided ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full ${changeTypeDot(change.change_type)}`} />
                      <span className="font-medium text-gray-900">{change.document ?? 'Untitled'}</span>
                      <FiArrowRight className="w-3 h-3 text-gray-300" />
                      <span className="text-gray-500">{change.section ?? 'General'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{change.change_type ?? ''}</span>
                      <span className={`${change.impact === 'major' ? 'text-red-400' : 'text-gray-400'}`}>{change.impact ?? ''}</span>
                    </div>
                  </div>
                  {change.summary && <p className="text-sm text-gray-500 mb-3">{change.summary}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {change.before && (
                      <div className="bg-red-50/50 rounded p-3 border border-red-100">
                        <p className="text-xs text-red-400 mb-1">Before</p>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap">{change.before}</pre>
                      </div>
                    )}
                    {change.after && (
                      <div className="bg-green-50/50 rounded p-3 border border-green-100">
                        <p className="text-xs text-green-500 mb-1">After</p>
                        <pre className="text-xs text-green-700 whitespace-pre-wrap">{change.after}</pre>
                      </div>
                    )}
                  </div>
                  {decided ? (
                    <span className={`text-xs font-medium ${decided === 'approved' ? 'text-green-600' : 'text-red-500'}`}>{decided}</span>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => onApprove(change, idx)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors">
                        <FiCheck className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => onReject(change, idx)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors">
                        <FiX className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!displayResult && !loading && (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-300">No results yet. Process notes to see the diff preview.</p>
        </div>
      )}
    </div>
  )
}
