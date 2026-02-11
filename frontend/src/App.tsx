import { useState, useEffect } from 'react'
import { Sparkles, Image, Library, Settings, BarChart3 } from 'lucide-react'
import Generator from './components/Generator'
import Gallery from './components/Gallery'
import PromptLibrary from './components/PromptLibrary'
import { AnalyticsDashboard } from './components/Analytics'
import CreditsPage from './pages/Credits'
import { CreditsBadge } from './components/CreditsBadge'
import { Toaster } from 'react-hot-toast'

type Tab = 'generate' | 'gallery' | 'prompts' | 'analytics' | 'credits'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generate')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: 'Generate', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'gallery', label: 'Gallery', icon: <Image className="w-5 h-5" /> },
    { id: 'prompts', label: 'Prompts', icon: <Library className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ]

  // Check if we're on the credits page
  const [showCreditsPage, setShowCreditsPage] = useState(false)
  useEffect(() => {
    if (window.location.pathname === '/credits') {
      setShowCreditsPage(true)
    }
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Content Studio</h1>
                <p className="text-sm text-gray-500">Generate, manage, and organize AI images</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CreditsBadge />
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Settings className="w-4 h-4" />
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-6xl mx-auto mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {showCreditsPage ? (
          <CreditsPage />
        ) : (
          <>
            {activeTab === 'generate' && <Generator />}
            {activeTab === 'gallery' && <Gallery />}
            {activeTab === 'prompts' && <PromptLibrary />}
            {activeTab === 'analytics' && <AnalyticsDashboard />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
