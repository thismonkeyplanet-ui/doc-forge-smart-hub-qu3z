'use client'

import { useState } from 'react'
import { FiFolder, FiFileText, FiSearch, FiGlobe, FiDatabase, FiList, FiArrowRight, FiX, FiCheckCircle, FiArrowLeft } from 'react-icons/fi'

interface WelcomeIntroProps {
  onDismiss: () => void
}

const steps = [
  {
    title: 'Welcome to DocFlow',
    subtitle: 'Your Intelligent Documentation Hub',
    description: 'DocFlow uses AI-powered agents to help you manage, update, and monitor your documentation effortlessly. Here is a quick walkthrough of how everything works.',
    icon: FiCheckCircle,
    color: 'bg-gray-900',
  },
  {
    title: 'My Documents',
    subtitle: 'Your central document library',
    description: 'This is where all your documents live. Create new documents manually, import from a URL, or upload files. Each document is organized into sections that you can edit inline. Think of it as your single source of truth.',
    icon: FiFolder,
    color: 'bg-blue-600',
    tips: ['Create documents in three ways: manual, URL import, or file upload', 'Click any document to view and edit its sections inline', 'Add tags to organize and categorize your docs'],
  },
  {
    title: 'Change Processor',
    subtitle: 'Turn meeting notes into document updates',
    description: 'Paste your raw meeting notes, changelogs, or any unstructured text here. The AI pipeline will analyze it, identify which documents need updating, and generate precise before/after diffs for your review.',
    icon: FiFileText,
    color: 'bg-violet-600',
    tips: ['Paste any raw text -- meeting notes, emails, changelogs', 'AI breaks it into targeted changes per document', 'Review each change and approve or reject individually'],
  },
  {
    title: 'Doc Search',
    subtitle: 'Search across all your documentation',
    description: 'Search simultaneously across your local documents and the AI knowledge base. Results are ranked by relevance and you get AI-suggested keywords to refine your search.',
    icon: FiSearch,
    color: 'bg-emerald-600',
    tips: ['Searches both internal documents and the knowledge base', 'Filter results by source: internal docs or knowledge base', 'Get AI-powered keyword suggestions for better results'],
  },
  {
    title: 'Link Monitor',
    subtitle: 'Detect drift in published documentation',
    description: 'Add links to your externally published documents and DocFlow will compare them against your internal versions. It flags differences, rates severity, and recommends actions to keep everything in sync.',
    icon: FiGlobe,
    color: 'bg-amber-600',
    tips: ['Add published URLs paired with their internal document', 'AI compares external content against your source of truth', 'Get severity ratings and actionable recommendations'],
  },
  {
    title: 'Training Library',
    subtitle: 'Train the AI with your own documents',
    description: 'Upload your reference documents, style guides, and templates here. The AI agents use this knowledge base to give you more accurate and context-aware results across the entire platform.',
    icon: FiDatabase,
    color: 'bg-cyan-600',
    tips: ['Two knowledge bases: Doc Library and Style Guide', 'Upload PDFs, DOCX, or TXT files', 'The more you train it, the smarter DocFlow gets'],
  },
  {
    title: 'Activity Log',
    subtitle: 'Full audit trail of all changes',
    description: 'Track every change that has been approved or rejected. Review rejected items and reprocess them. Upload supporting evidence documents for compliance and record-keeping.',
    icon: FiList,
    color: 'bg-rose-600',
    tips: ['Three tabs: Change Logs, Rejected Queue, Evidence Upload', 'Reprocess rejected changes with one click', 'Upload evidence documents for audit compliance'],
  },
]

export default function WelcomeIntro({ onDismiss }: WelcomeIntroProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = steps[currentStep]
  const Icon = step.icon
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${step.color} px-6 py-8 text-white relative`}>
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="text-sm text-white/80">{step.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>

          {step.tips && (
            <div className="mt-4 space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <FiCheckCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-500">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'bg-gray-900 w-5' : i < currentStep ? 'bg-gray-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            {isFirst && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip intro
              </button>
            )}

            <button
              onClick={() => {
                if (isLast) {
                  onDismiss()
                } else {
                  setCurrentStep(currentStep + 1)
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <FiArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
