'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { BossState } from '@/lib/game/types'

type VoiceStatus = 'idle' | 'loading' | 'speaking' | 'unavailable'

/**
 * Streams Ignis's line from /api/tts and plays it back. Falls back silently
 * (status: 'unavailable') when no ElevenLabs key is configured, so the duel
 * remains fully playable without voice.
 */
export function useBossVoice(enabled: boolean) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const unavailableRef = useRef(false)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cleanup()
    setStatus((prev) => (prev === 'unavailable' ? prev : 'idle'))
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  const speak = useCallback(
    async (text: string, state: BossState) => {
      if (!enabled || unavailableRef.current || !text.trim()) return

      abortRef.current?.abort()
      cleanup()

      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, state }),
          signal: controller.signal,
        })

        if (response.status === 503) {
          unavailableRef.current = true
          setStatus('unavailable')
          return
        }

        if (!response.ok || !response.body) {
          setStatus('idle')
          return
        }

        // Buffer the stream into a blob URL — broadly compatible and gapless.
        const blob = await response.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        urlRef.current = url

        const audio = new Audio(url)
        audio.crossOrigin = 'anonymous'
        audioRef.current = audio

        audio.onended = () => setStatus('idle')
        audio.onerror = () => setStatus('idle')

        setStatus('speaking')
        await audio.play().catch(() => {
          // Autoplay blocked until the first user gesture — fail quietly.
          setStatus('idle')
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setStatus('idle')
        }
      }
    },
    [cleanup, enabled],
  )

  return {
    speak,
    stop,
    status,
    isSpeaking: status === 'speaking',
    isUnavailable: status === 'unavailable',
  }
}
