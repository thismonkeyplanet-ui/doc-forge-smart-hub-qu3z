'use client'

import { useEffect, useState } from 'react'
import { FiX, FiCheck, FiCheckCircle, FiArrowRight, FiChevronRight } from 'react-icons/fi'

interface Change {
  document?: string
  section?: string
  change_type?: string
  before?: string
  after?: string
  impact?: string
  summary?: string
}

interface ReviewPanelProps {
  changes: Change[]
  open: boolean
  onClose: () => void
  onApprove: (change: Change, index: number) => void
  onReject: (change: Change, index: number) => void
  onApproveAll: () => void
  decisions: Record<number, 'approved' | 'rejected'>
}

function changeTypeBadge(type?: string) {
  switch (type?.toLowerCase()) {
    case 'addition': return { bg: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' }
    case 'modification': return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
    case 'deletion': return { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
    default: return { bg: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' }
  }
}

export default function ReviewPanel({ changes, open, onClose, onApprove, onReject, onApproveAll, decisions }: ReviewPanelProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  const pendingCount = changes.filter((_, i) => !decisions[i]).length
  const approvedCount = Object.values(decisions).filter(d => d === 'approved').length
  const rejectedCount = Object.values(decisions).filter(d => d === 'rejected').length

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/10 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Fixed header */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Review Changes</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{changes.length} total</span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">{pendingCount} pending</span>
            {approvedCount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-green-600">{approvedCount} approved</span>
              </>
            )}
            {rejectedCount > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-red-500">{rejectedCount} rejected</span>
              </>
            )}
          </div>
        </div>

        {/* Scrollable changes list */}
        <div className="flex-1 overflow-y-auto">
          {changes.map((change, idx) => {
            const badge = changeTypeBadge(change.change_type)
            const decided = decisions[idx]

            return (
              <div
                key={idx}
                className={`px-5 py-4 border-b border-gray-100 ${decided ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                    <span className="font-medium text-gray-900 truncate">{change.document ?? 'Untitled'}</span>
                    <FiArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                    <span className="text-gray-500 truncate">{change.section ?? 'General'}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${badge.bg}`}>
                    {change.change_type ?? 'unknown'}
                  </span>
                </div>

                {change.summary && (
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">{change.summary}</p>
                )}

                {(change.before || change.after) && (
                  <div className="space-y-2 mb-3">
                    {change.before && (
                      <div className="bg-red-50/60 rounded p-2.5 border border-red-100">
                        <p className="text-[10px] text-red-400 mb-0.5 font-medium uppercase tracking-wide">Before</p>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap leading-relaxed">{change.before}</pre>
                      </div>
                    )}
                    {change.after && (
                      <div className="bg-green-50/60 rounded p-2.5 border border-green-100">
                        <p className="text-[10px] text-green-500 mb-0.5 font-medium uppercase tracking-wide">After</p>
                        <pre className="text-xs text-green-700 whitespace-pre-wrap leading-relaxed">{change.after}</pre>
                      </div>
                    )}
                  </div>
                )}

                {change.impact && (
                  <span className={`text-[10px] ${change.impact === 'major' ? 'text-red-400' : 'text-gray-400'}`}>
                    {change.impact} impact
                  </span>
                )}

                {decided ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    {decided === 'approved' ? (
                      <FiCheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <FiX className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${decided === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                      {decided}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onApprove(change, idx)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-700 border border-green-200 rounded hover:bg-green-50 transition-colors"
                    >
                      <FiCheck className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => onReject(change, idx)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <FiX className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Fixed bottom bar - always visible regardless of scroll */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
          {pendingCount > 0 ? (
            <button
              onClick={onApproveAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
            >
              <FiCheckCircle className="w-4 h-4" />
              Approve All ({pendingCount} pending)
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-1.5">
                <FiCheckCircle className="w-4 h-4" /> All changes reviewed
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Trigger button to open the panel - shown when changes exist
export function ReviewTrigger({ count, pendingCount, onClick }: { count: number; pendingCount: number; onClick: () => void }) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 pl-3 pr-2 py-3 bg-gray-900 text-white rounded-l-lg shadow-lg hover:bg-gray-800 transition-all hover:pr-3 group"
    >
      <div className="text-left">
        <p className="text-xs font-medium">{count} Changes</p>
        {pendingCount > 0 && (
          <p className="text-[10px] text-gray-400">{pendingCount} pending review</p>
        )}
      </div>
      <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}
