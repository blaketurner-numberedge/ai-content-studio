import { useState, useEffect } from 'react'
import { Wand2, Loader2, Download, Copy, Coins } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiFetch } from '../lib/api'
import { getCreditBalance, MODEL_CREDIT_COSTS } from '../lib/credits'

interface ModelOption {
  sizes: string[]
  qualities: string[]
}

interface ModelOptions {
  'dall-e-3': ModelOption
  'dall-e-2': ModelOption
  'gpt-image-1': ModelOption
  'gpt-image-1-mini': ModelOption
}

function getUserId(): string {
  let userId = localStorage.getItem('deviceId')
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('deviceId', userId)
  }
  return userId
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-device-id': getUserId(),
  }
}

export default function Generator() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<'dall-e-3' | 'dall-e-2' | 'gpt-image-1' | 'gpt-image-1-mini'>('dall-e-3')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('standard')
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid')
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<any[]>([])
  const [modelOptions, setModelOptions] = useState<ModelOptions | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [batchPrompts, setBatchPrompts] = useState('')
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    apiFetch('/api/images/models')
      .then(r => r.json())
      .then(setModelOptions)
    loadCreditBalance()
    // Refresh balance every 30 seconds
    const interval = setInterval(loadCreditBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadCreditBalance() {
    try {
      const data = await getCreditBalance()
      setCreditBalance(data.balance)
    } catch (err) {
      console.error('Failed to load balance:', err)
    }
  }

  useEffect(() => {
    if (modelOptions) {
      setSize(modelOptions[model].sizes[0])
      setQuality(modelOptions[model].qualities[0])
    }
  }, [model, modelOptions])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/api/images/generate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          prompt,
          model,
          size,
          quality,
          style: model === 'dall-e-3' ? style : undefined,
          n: 1,
        }),
      })

      const data = await res.json()
      if (res.status === 402) {
        toast.error(
          <div>
            <p>Insufficient credits ({data.balance} available, {data.required} needed)</p>
            <a href="/credits" className="text-purple-600 underline">Buy credits</a>
          </div>,
          { duration: 5000 }
        )
        setCreditBalance(data.balance)
        return
      }
      if (data.success) {
        setGeneratedImages(data.images)
        setCreditBalance(data.remainingCredits)
        toast.success(`Image generated! Used ${data.creditsUsed} credit${data.creditsUsed > 1 ? 's' : ''}. ${data.remainingCredits} remaining.`)
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (err) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchGenerate = async () => {
    const prompts = batchPrompts.split('\n').filter(p => p.trim())
    if (prompts.length === 0) {
      toast.error('Please enter at least one prompt')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/api/images/batch', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompts, model, size, quality }),
      })

      const data = await res.json()
      if (res.status === 402) {
        toast.error(
          <div>
            <p>Insufficient credits ({data.balance} available, {data.required} needed)</p>
            <a href="/credits" className="text-purple-600 underline">Buy credits</a>
          </div>,
          { duration: 5000 }
        )
        setCreditBalance(data.balance)
        return
      }
      if (data.success) {
        const successful = data.results.filter((r: any) => r.success)
        setCreditBalance(data.remainingCredits)
        toast.success(`Generated ${successful.length}/${prompts.length} images. Used ${data.creditsUsed} credits. ${data.remainingCredits} remaining.`)
        setBatchPrompts('')
      } else {
        toast.error(data.error || 'Batch generation failed')
      }
    } catch (err) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt)
    toast.success('Prompt copied!')
  }

  // Calculate credit cost for current selection
  const creditCost = batchMode 
    ? (MODEL_CREDIT_COSTS[model] || 1) * batchPrompts.split('\n').filter(p => p.trim()).length || 0
    : MODEL_CREDIT_COSTS[model] || 1

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Image Generation</h2>
          <div className="flex items-center gap-3">
            {creditBalance !== null && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span>{creditBalance} credits</span>
              </div>
            )}
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                batchMode ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {batchMode ? 'Batch Mode' : 'Single Mode'}
            </button>
          </div>
        </div>

        {batchMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompts (one per line, max 10)
              </label>
              <textarea
                value={batchPrompts}
                onChange={(e) => setBatchPrompts(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                placeholder="Enter multiple prompts, one per line..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="Describe the image you want to generate..."
                />
                <button
                  onClick={copyPrompt}
                  className="absolute right-3 top-3 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
            >
              <option value="dall-e-3">DALL-E 3</option>
              <option value="dall-e-2">DALL-E 2</option>
              <option value="gpt-image-1">GPT Image 1</option>
              <option value="gpt-image-1-mini">GPT Image 1 Mini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
            >
              {modelOptions?.[model]?.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
            >
              {modelOptions?.[model]?.qualities.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        {model === 'dall-e-3' && !batchMode && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
            <div className="flex gap-2">
              {['vivid', 'natural'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s as any)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    style === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Credit Cost */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span>Cost: {creditCost} credit{creditCost !== 1 ? 's' : ''}</span>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-500">{model === 'dall-e-2' ? 'DALL-E 2: 1 credit' : model === 'dall-e-3' ? 'DALL-E 3: 2 credits' : model === 'gpt-image-1-mini' ? 'GPT Image 1 Mini: 1 credit' : 'GPT Image 1: 3 credits'}</span>
        </div>

        {/* Generate Button */}
        <button
          onClick={batchMode ? handleBatchGenerate : handleGenerate}
          disabled={loading || (creditBalance !== null && creditBalance < creditCost)}
          className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : creditBalance !== null && creditBalance < creditCost ? (
            <>
              <Coins className="w-5 h-5" />
              Insufficient Credits
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              {batchMode ? 'Generate Batch' : 'Generate Image'}
            </>
          )}
        </button>
      </div>

      {/* Generated Images */}
      {!batchMode && generatedImages.length > 0 && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedImages.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full rounded-xl shadow-md"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                  <a
                    href={img.url}
                    download
                    className="p-2 bg-white rounded-lg text-gray-900 hover:bg-gray-100"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
                {img.revised_prompt && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{img.revised_prompt}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
