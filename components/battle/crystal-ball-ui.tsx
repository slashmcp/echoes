'use client'

import React, { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CrystalBallUIProps {
  onClose: () => void
}

export function CrystalBallUI({ onClose }: CrystalBallUIProps) {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsGenerating(true)
    
    // Pollinations.ai returns an image directly
    const newImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?nologo=1&seed=${Math.floor(Math.random() * 10000)}`
    
    // Create an image object to preload it
    const img = new Image()
    img.onload = () => {
      setImageUrl(newImageUrl)
      setIsGenerating(false)
    }
    img.onerror = () => {
      setIsGenerating(false)
      // Handle error gracefully if needed
    }
    img.src = newImageUrl
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg p-6 bg-card border border-border/50 rounded-xl shadow-2xl shadow-cyan-900/20 panel-etched">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </Button>

        <div className="flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif tracking-widest text-cyan-400 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              Gaze into the Void
            </h2>
            <p className="text-sm text-muted-foreground">
              Speak your desires to the Crystal Ball, and it shall reveal them.
            </p>
          </div>

          <div className="relative w-full aspect-square max-w-[320px] rounded-full border-4 border-cyan-900/50 bg-black/50 overflow-hidden shadow-[inset_0_0_50px_rgba(34,211,238,0.1)] flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Generated vision"
                className="w-full h-full object-cover animate-in zoom-in duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-950/20 to-black">
                <Sparkles className="size-12 text-cyan-900/50" />
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="size-8 text-cyan-400 animate-spin" />
              </div>
            )}
            
            {/* Glass reflection overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
            <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(34,211,238,0.3)] pointer-events-none" />
          </div>

          <form onSubmit={handleGenerate} className="w-full flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A majestic dragon hoard..."
              className="flex-1 bg-black/50 border border-cyan-900/50 rounded-md px-4 py-2 text-sm text-cyan-100 placeholder:text-cyan-900/50 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              disabled={isGenerating}
            />
            <Button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="bg-cyan-950 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 border border-cyan-800"
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : 'Gaze'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
