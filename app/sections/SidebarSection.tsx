'use client'

import { FiFileText, FiSearch, FiGlobe, FiDatabase, FiList, FiSettings, FiFolder, FiHelpCircle } from 'react-icons/fi'
import { Switch } from '@/components/ui/switch'
import { UserMenu } from 'lyzr-architect/client'

interface SidebarSectionProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  sampleMode: boolean
  setSampleMode: (v: boolean) => void
  onShowIntro: () => void
}

const navItems = [
  { id: 'documents', label: 'My Documents', icon: FiFolder, hint: 'View & edit docs' },
  { id: 'process', label: 'Change Processor', icon: FiFileText, hint: 'Notes to updates' },
  { id: 'search', label: 'Doc Search', icon: FiSearch, hint: 'Find anything' },
  { id: 'sync', label: 'Link Monitor', icon: FiGlobe, hint: 'Check published links' },
  { id: 'kb', label: 'Training Library', icon: FiDatabase, hint: 'Train the AI' },
  { id: 'audit', label: 'Activity Log', icon: FiList, hint: 'Track all changes' },
]

export default function SidebarSection({ activeTab, setActiveTab, sampleMode, setSampleMode, onShowIntro }: SidebarSectionProps) {
  return (
    <aside className="w-[260px] min-h-screen bg-[#f8f8f8] border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">DocFlow</h1>
        <p className="text-xs text-gray-400 mt-0.5">Intelligent Documentation Hub</p>
      </div>

      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5 ${isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'}`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-left">
                <span className={`block ${isActive ? 'font-medium' : 'font-normal'}`}>{item.label}</span>
                <span className="block text-[11px] text-gray-400 font-normal">{item.hint}</span>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200 space-y-3">
        <button
          onClick={onShowIntro}
          className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiHelpCircle className="w-3.5 h-3.5" />
          How DocFlow Works
        </button>
        <div className="flex items-center justify-between">
          <label htmlFor="sample-toggle-sidebar" className="text-xs text-gray-400 cursor-pointer flex items-center gap-2">
            <FiSettings className="w-3.5 h-3.5" />
            Demo Mode
          </label>
          <Switch id="sample-toggle-sidebar" checked={sampleMode} onCheckedChange={setSampleMode} />
        </div>
        <div className="pt-1">
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}
