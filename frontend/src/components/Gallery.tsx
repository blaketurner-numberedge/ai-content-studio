import { useState, useEffect } from 'react'
import { Trash2, Download, ExternalLink, ImageIcon, Calendar, Sparkles, Filter, Search, X, Archive, CheckSquare, Square, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiFetch, getImageUrl } from '../lib/api'

interface GalleryItem {
  id: string
  url: string
  prompt: string
  model: string
  size: string
  quality: string
  style?: string
  revised_prompt?: string
  createdAt: string
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModel, setFilterModel] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadGallery()
  }, [])

  const loadGallery = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/gallery')
      const data = await res.json()
      if (data.items) {
        setItems(data.items)
      }
    } catch (err) {
      toast.error('Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await apiFetch(`/api/gallery/${id}`, { method: 'DELETE' })
      setItems(items.filter(item => item.id !== id))
      if (selectedItem?.id === id) setSelectedItem(null)
      toast.success('Image deleted')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(getImageUrl(url))
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
      toast.success('Download started')
    } catch (err) {
      toast.error('Download failed')
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)))
    }
  }

  const downloadZip = async (ids?: string[]) => {
    try {
      setIsExporting(true)
      const url = ids && ids.length > 0 
        ? '/api/gallery/export/zip' 
        : '/api/gallery/export/zip'
      
      const options: RequestInit = ids && ids.length > 0 ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      } : { method: 'GET' }

      const res = await apiFetch(url, options)
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `gallery-export-${ids?.length || 'all'}-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success(`Downloaded ${ids?.length || 'all'} images as ZIP`)
    } catch (err) {
      toast.error('Failed to export ZIP')
    } finally {
      setIsExporting(false)
    }
  }

  const batchDelete = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Delete ${selectedIds.size} images? This cannot be undone.`)) return
    
    try {
      const res = await apiFetch('/api/gallery/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      
      if (!res.ok) throw new Error('Delete failed')
      
      const data = await res.json()
      setItems(items.filter(item => !selectedIds.has(item.id)))
      setSelectedIds(new Set())
      toast.success(`Deleted ${data.deleted} images`)
    } catch (err) {
      toast.error('Failed to delete images')
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesModel = filterModel === 'all' || item.model === filterModel
    return matchesSearch && matchesModel
  })

  const uniqueModels = Array.from(new Set(items.map(item => item.model)))

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading gallery...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search, Filter, and Batch Actions */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt or model..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
            >
              <option value="all">All Models</option>
              {uniqueModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsSelecting(!isSelecting)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              isSelecting 
                ? 'bg-purple-100 border-purple-300 text-purple-700' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {isSelecting ? 'Done' : 'Select'}
          </button>
        </div>
        
        {/* Batch Actions Bar */}
        {isSelecting && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {selectedIds.size === filteredItems.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
            {selectedIds.size > 0 && (
              <>
                <div className="flex-1" />
                <button
                  onClick={() => downloadZip(Array.from(selectedIds))}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export ZIP'}
                </button>
                <button
                  onClick={batchDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Export All Option (when not selecting) */}
        {!isSelecting && items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {filteredItems.length} of {items.length} images
            </span>
            <button
              onClick={() => downloadZip()}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <Package className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export All as ZIP'}
            </button>
          </div>
        )}
        
        {!isSelecting && items.length === 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredItems.length} of {items.length} images
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
          <p className="text-gray-500">Generate your first image to see it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden group transition-shadow ${
                isSelecting ? '' : 'cursor-pointer hover:shadow-2xl'
              } ${selectedIds.has(item.id) ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => isSelecting ? toggleSelection(item.id) : setSelectedItem(item)}
            >
              <div className="relative aspect-square">
                <img
                  src={getImageUrl(item.url)}
                  alt={item.prompt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                
                {/* Selection Checkbox */}
                {isSelecting && (
                  <div className="absolute top-3 left-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      selectedIds.has(item.id) 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'bg-white/90 border-gray-300'
                    }`}>
                      {selectedIds.has(item.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.prompt}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {item.model}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex flex-col md:flex-row h-full">
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={getImageUrl(selectedItem.url)}
                  alt={selectedItem.prompt}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              </div>
              <div className="w-full md:w-80 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Image Details</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Prompt</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedItem.prompt}</p>
                  </div>
                  {selectedItem.revised_prompt && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Revised Prompt</label>
                      <p className="text-sm text-gray-600 mt-1">{selectedItem.revised_prompt}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Model</label>
                      <p className="text-sm text-gray-900">{selectedItem.model}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Size</label>
                      <p className="text-sm text-gray-900">{selectedItem.size}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Quality</label>
                      <p className="text-sm text-gray-900">{selectedItem.quality}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
                      <p className="text-sm text-gray-900">{new Date(selectedItem.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <a
                      href={getImageUrl(selectedItem.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Full Size
                    </a>
                    <button
                      onClick={() => downloadImage(selectedItem.url, `${selectedItem.id}.png`)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => deleteItem(selectedItem.id)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
