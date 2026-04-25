'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiFileText, FiDatabase } from 'react-icons/fi'
import { Progress } from '@/components/ui/progress'

interface SearchResult {
  document?: string
  section?: string
  relevance_score?: number
  excerpt?: string
  summary?: string
}

interface SearchResponse {
  results?: SearchResult[]
  total_results?: number
  query_summary?: string
  keyword_suggestions?: string[]
}

interface LocalDoc {
  _id: string
  title: string
  sections: { title: string; content: string; order: number }[]
  tags: string[]
  updatedAt?: string
}

interface SearchSectionProps {
  sampleMode: boolean
  loading: boolean
  searchResult: SearchResponse | null
  onSearch: (query: string) => void
  activeAgentId: string | null
}

const SAMPLE_SEARCH: SearchResponse = {
  total_results: 3,
  query_summary: 'Found 3 documents matching "OAuth authentication" across the documentation library.',
  keyword_suggestions: ['bearer token', 'authorization header', 'token refresh', 'API security'],
  results: [
    { document: 'API Reference', section: 'Authentication', relevance_score: 0.95, excerpt: 'Use OAuth 2.0 for authentication. Obtain a bearer token from the /oauth/token endpoint and include it in the Authorization header as Bearer <token>.', summary: 'Primary authentication guide covering OAuth 2.0 flow and token management.' },
    { document: 'Security Guide', section: 'Token Management', relevance_score: 0.82, excerpt: 'Access tokens expire after 1 hour. Use the refresh token to obtain a new access token without requiring user re-authentication.', summary: 'Details on token lifecycle, refresh flows, and revocation.' },
    { document: 'Migration Guide', section: 'Auth Migration', relevance_score: 0.67, excerpt: 'If you are migrating from API key authentication, update your client to use the OAuth 2.0 client credentials flow.', summary: 'Step-by-step guide for migrating from API keys to OAuth 2.0.' },
  ]
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
      : part
  )
}

export default function SearchSection({ sampleMode, loading, searchResult, onSearch, activeAgentId: _activeAgentId }: SearchSectionProps) {
  const [query, setQuery] = useState('')
  const [localResults, setLocalResults] = useState<LocalDoc[]>([])
  const [localSearching, setLocalSearching] = useState(false)
  const [activeSource, setActiveSource] = useState<'all' | 'local' | 'kb'>('all')

  const displayResult = sampleMode ? SAMPLE_SEARCH : searchResult
  const results = Array.isArray(displayResult?.results) ? displayResult.results : []
  const suggestions = Array.isArray(displayResult?.keyword_suggestions) ? displayResult.keyword_suggestions : []

  const searchLocal = useCallback(async (q: string) => {
    if (!q.trim()) { setLocalResults([]); return }
    setLocalSearching(true)
    try {
      const res = await fetch(`/api/documents?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setLocalResults(json.data)
      }
    } catch {
      // silently fail local search
    }
    setLocalSearching(false)
  }, [])

  function handleSearch(q: string) {
    if (!q.trim()) return
    searchLocal(q)
    onSearch(q)
  }

  // Convert local docs to search result format for display
  const localAsResults: SearchResult[] = localResults.flatMap(doc => {
    const searchQuery = (sampleMode ? 'OAuth authentication' : query).toLowerCase()
    const matchingSections = Array.isArray(doc.sections) ? doc.sections.filter(s =>
      s.title?.toLowerCase().includes(searchQuery) || s.content?.toLowerCase().includes(searchQuery)
    ) : []

    if (matchingSections.length > 0) {
      return matchingSections.map(s => ({
        document: doc.title,
        section: s.title,
        relevance_score: 1.0,
        excerpt: s.content?.substring(0, 200) + (s.content && s.content.length > 200 ? '...' : ''),
        summary: `Internal document - ${doc.title}`,
      }))
    }
    // Title or tag match
    return [{
      document: doc.title,
      section: '',
      relevance_score: 0.9,
      excerpt: Array.isArray(doc.sections) && doc.sections[0]?.content
        ? doc.sections[0].content.substring(0, 200) + (doc.sections[0].content.length > 200 ? '...' : '')
        : '',
      summary: `Internal document - matched by title or tags`,
    }]
  })

  const filteredResults = activeSource === 'local' ? localAsResults
    : activeSource === 'kb' ? results
    : [...localAsResults, ...results]

  const isSearching = loading || localSearching
  const currentQuery = sampleMode ? 'OAuth authentication' : query

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Doc Search</h2>
        <p className="text-sm text-gray-400">Find anything across your documents and AI knowledge base, with relevance ranking and smart keyword suggestions.</p>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          placeholder="Search across your documentation..."
          className="w-full pl-10 pr-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
          value={sampleMode ? 'OAuth authentication' : query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch(sampleMode ? 'OAuth authentication' : query)}
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching...</span>
        )}
      </div>

      {/* Source filter tabs */}
      {(filteredResults.length > 0 || displayResult) && (
        <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
          {[
            { key: 'all' as const, label: 'All Results', count: localAsResults.length + results.length },
            { key: 'local' as const, label: 'Internal Docs', icon: <FiFileText className="w-3 h-3" />, count: localAsResults.length },
            { key: 'kb' as const, label: 'Knowledge Base', icon: <FiDatabase className="w-3 h-3" />, count: results.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSource(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeSource === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Suggestions:</span>
          {suggestions.map((kw, i) => (
            <button key={i} onClick={() => { setQuery(kw); handleSearch(kw) }} className="text-xs text-blue-500 hover:text-blue-600 hover:underline transition-colors">{kw}</button>
          ))}
        </div>
      )}

      {displayResult?.query_summary && (
        <p className="text-sm text-gray-400">{displayResult.query_summary}</p>
      )}

      {filteredResults.length > 0 ? (
        <div className="border-t border-gray-100">
          {filteredResults.map((item, idx) => (
            <div key={idx} className="py-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {localAsResults.includes(item)
                    ? <FiFileText className="w-3.5 h-3.5 text-blue-400" />
                    : <FiDatabase className="w-3.5 h-3.5 text-purple-400" />
                  }
                  <span className="text-sm font-medium text-gray-900">{highlightMatch(item.document ?? 'Unknown', currentQuery)}</span>
                  {item.section && <span className="text-xs text-gray-400">{highlightMatch(item.section, currentQuery)}</span>}
                </div>
                <div className="flex items-center gap-2 w-28">
                  <Progress value={(item.relevance_score ?? 0) * 100} className="h-1 flex-1" />
                  <span className="text-xs text-gray-400 w-8 text-right">{Math.round((item.relevance_score ?? 0) * 100)}%</span>
                </div>
              </div>
              {item.excerpt && (
                <p className="text-sm text-gray-600 leading-relaxed mb-1">{highlightMatch(item.excerpt, currentQuery)}</p>
              )}
              {item.summary && (
                <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
              )}
            </div>
          ))}
        </div>
      ) : !displayResult && localResults.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-300">Enter a query to search across all documents.</p>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-300">No results found.</p>
        </div>
      )}
    </div>
  )
}
