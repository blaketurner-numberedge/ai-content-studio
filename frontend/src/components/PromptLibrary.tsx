import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, Sparkles, Tag, Search, X, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiFetch } from '../lib/api'

interface PromptTemplate {
  id: string
  name: string
  prompt: string
  category: string
  tags: string[]
  createdAt?: string
}

interface PromptLibraryProps {
  onUsePrompt?: (prompt: string) => void
}

export default function PromptLibrary({ onUsePrompt }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    prompt: '',
    category: 'custom',
    tags: '',
  })

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/prompts')
      const data = await res.json()
      if (data.prompts) {
        setPrompts(data.prompts)
      }
    } catch (err) {
      toast.error('Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  const addPrompt = async () => {
    if (!newPrompt.name.trim() || !newPrompt.prompt.trim()) {
      toast.error('Name and prompt are required')
      return
    }

    try {
      const res = await apiFetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPrompt.name,
          prompt: newPrompt.prompt,
          category: newPrompt.category,
          tags: newPrompt.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()
      setPrompts([...prompts, data.prompt])
      setShowAddModal(false)
      setNewPrompt({ name: '', prompt: '', category: 'custom', tags: '' })
      toast.success('Prompt added')
    } catch (err) {
      toast.error('Failed to add prompt')
    }
  }

  const deletePrompt = async (id: string) => {
    try {
      await apiFetch(`/api/prompts/${id}`, { method: 'DELETE' })
      setPrompts(prompts.filter(p => p.id !== id))
      toast.success('Prompt deleted')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied!')
  }

  const usePrompt = (prompt: string) => {
    if (onUsePrompt) {
      onUsePrompt(prompt)
      toast.success('Prompt sent to generator')
    } else {
      copyPrompt(prompt)
    }
  }

  const categories = Array.from(new Set(prompts.map(p => p.category)))

  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categoryColors: Record<string, string> = {
    commercial: 'bg-blue-100 text-blue-700',
    portrait: 'bg-purple-100 text-purple-700',
    nature: 'bg-green-100 text-green-700',
    art: 'bg-pink-100 text-pink-700',
    concept: 'bg-orange-100 text-orange-700',
    custom: 'bg-gray-100 text-gray-700',
  }

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading prompts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Prompt
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredPrompts.length} of {prompts.length} prompts
        </div>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
          <p className="text-gray-500">Add your first prompt template to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[prompt.category] || categoryColors.custom}`}>
                    {prompt.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => usePrompt(prompt.prompt)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Use this prompt"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyPrompt(prompt.prompt)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy prompt"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePrompt(prompt.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete prompt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{prompt.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3 font-mono bg-gray-50 p-2 rounded-lg">
                {prompt.prompt}
              </p>
              {prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {prompt.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Prompt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Prompt</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newPrompt.name}
                  onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  placeholder="e.g., Product Photography"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Template</label>
                <textarea
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                  rows={4}
                  placeholder="Describe the image. Use {variable} for placeholders..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Use {'{variable}'} syntax for placeholders you can replace later</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                  placeholder="e.g., commercial, art, portrait"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newPrompt.tags}
                  onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                  placeholder="product, studio, professional"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPrompt}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
