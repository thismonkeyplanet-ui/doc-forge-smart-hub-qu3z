'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiAlertTriangle, FiCheckCircle, FiExternalLink } from 'react-icons/fi'
import { Input } from '@/components/ui/input'

interface DriftItem {
  url?: string
  internal_document?: string
  drift_detected?: boolean
  severity?: string
  differences?: string[]
  recommendation?: string
}

interface DriftReport {
  drift_report?: DriftItem[]
  total_urls_checked?: number
  drift_count?: number
  overall_status?: string
}

interface PublishedLink {
  _id?: string
  url?: string
  document_id?: string
  drift_status?: string
  last_checked?: string
}

interface PublishingSyncSectionProps {
  sampleMode: boolean
  loading: boolean
  driftResult: DriftReport | null
  onCheckDrift: (links: PublishedLink[]) => void
  activeAgentId: string | null
}

const SAMPLE_LINKS: PublishedLink[] = [
  { _id: '1', url: 'https://docs.example.com/api/auth', document_id: 'API Reference', drift_status: 'drifted', last_checked: '2026-04-20' },
  { _id: '2', url: 'https://docs.example.com/guides/deploy', document_id: 'Deployment Guide', drift_status: 'synced', last_checked: '2026-04-22' },
]

const SAMPLE_DRIFT: DriftReport = {
  total_urls_checked: 2,
  drift_count: 1,
  overall_status: 'drift_detected',
  drift_report: [
    { url: 'https://docs.example.com/api/auth', internal_document: 'API Reference', drift_detected: true, severity: 'critical', differences: ['Authentication method changed from API keys to OAuth 2.0', 'Rate limiting values differ: external shows 100/min vs internal 500/min'], recommendation: 'Update external documentation to reflect OAuth 2.0 authentication and new rate limits immediately.' },
    { url: 'https://docs.example.com/guides/deploy', internal_document: 'Deployment Guide', drift_detected: false, severity: 'none', differences: [], recommendation: 'No action needed. External docs are in sync.' },
  ]
}

function statusDot(status?: string) {
  switch (status) {
    case 'drifted': return 'bg-red-500'
    case 'synced': return 'bg-green-500'
    default: return 'bg-gray-300'
  }
}

export default function PublishingSyncSection({ sampleMode, loading, driftResult, onCheckDrift, activeAgentId: _activeAgentId }: PublishingSyncSectionProps) {
  const [links, setLinks] = useState<PublishedLink[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [newDocRef, setNewDocRef] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)

  const displayLinks = sampleMode ? SAMPLE_LINKS : links
  const displayDrift = sampleMode ? SAMPLE_DRIFT : driftResult
  const driftItems = Array.isArray(displayDrift?.drift_report) ? displayDrift.drift_report : []

  useEffect(() => {
    if (!sampleMode) fetchLinks()
  }, [sampleMode])

  async function fetchLinks() {
    setFetchLoading(true)
    try {
      const res = await fetch('/api/published-links')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) setLinks(json.data)
    } catch { /* ignore */ }
    setFetchLoading(false)
  }

  async function addLink() {
    if (!newUrl.trim()) return
    try {
      const res = await fetch('/api/published-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: newUrl, document_id: newDocRef }) })
      const json = await res.json()
      if (json.success) { setNewUrl(''); setNewDocRef(''); fetchLinks() }
    } catch { /* ignore */ }
  }

  async function removeLink(id: string) {
    try {
      await fetch(`/api/published-links?id=${id}`, { method: 'DELETE' })
      fetchLinks()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Link Monitor</h2>
        <p className="text-sm text-gray-400">Add your published links and check if they have drifted from your internal source of truth.</p>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          <Input placeholder="https://docs.example.com/..." className="flex-1 border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-gray-400" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Input placeholder="Internal doc ref" className="w-40 border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-gray-400" value={newDocRef} onChange={(e) => setNewDocRef(e.target.value)} />
          <button onClick={addLink} disabled={!newUrl.trim()} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <FiPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {displayLinks.length > 0 ? (
          <div className="border-t border-gray-100">
            {displayLinks.map((link, idx) => (
              <div key={link._id ?? idx} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusDot(link.drift_status)}`} />
                  <span className="text-sm text-gray-700 truncate">{link.url ?? ''}</span>
                  {link.document_id && <span className="text-xs text-gray-400 shrink-0">{link.document_id}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{link.drift_status ?? 'unchecked'}</span>
                  {!sampleMode && (
                    <button onClick={() => removeLink(link._id ?? '')} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300 py-4 text-center">No URLs managed yet.</p>
        )}

        <button
          onClick={() => onCheckDrift(displayLinks)}
          disabled={loading || displayLinks.length === 0}
          className="mt-4 px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking Drift...' : 'Check Drift'}
        </button>
      </div>

      {displayDrift && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{displayDrift.total_urls_checked ?? 0} URLs checked</span>
            <span className="text-gray-200">|</span>
            <span className={(displayDrift.drift_count ?? 0) > 0 ? 'text-red-400' : 'text-green-500'}>{displayDrift.drift_count ?? 0} drifted</span>
          </div>

          <div className="border-t border-gray-100">
            {driftItems.map((item, idx) => (
              <div key={idx} className="py-5 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.drift_detected ? <FiAlertTriangle className="w-4 h-4 text-red-400" /> : <FiCheckCircle className="w-4 h-4 text-green-500" />}
                    <a href={item.url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-blue-500 transition-colors flex items-center gap-1">
                      {item.url ?? 'Unknown URL'} <FiExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {item.severity && item.severity !== 'none' && (
                    <span className={`text-xs ${item.severity === 'critical' ? 'text-red-400' : item.severity === 'moderate' ? 'text-amber-500' : 'text-blue-400'}`}>{item.severity}</span>
                  )}
                </div>
                {item.internal_document && <p className="text-xs text-gray-400">Internal: {item.internal_document}</p>}
                {Array.isArray(item.differences) && item.differences.length > 0 && (
                  <div className="pl-4 border-l-2 border-red-200 space-y-1">
                    {item.differences.map((diff, di) => (
                      <p key={di} className="text-xs text-gray-600">{diff}</p>
                    ))}
                  </div>
                )}
                {item.recommendation && (
                  <p className="text-sm text-gray-500">{item.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
