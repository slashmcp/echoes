'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BossState } from '@/lib/game/types'

type VoiceStatus = 'idle' | 'loading' | 'speaking' | 'unavailable'

export function useBossVoice(enabled: boolean) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const unavailableRef = useRef(false)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

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
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    currentUtteranceRef.current = null
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cleanup()
    setStatus((prev) => (prev === 'unavailable' ? prev : 'idle'))
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  // Native Speech Synthesis Fallback (Dragon Preset)
  const speakFallback = useCallback((text: string, state: BossState) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setStatus('idle')
      return
    }

    window.speechSynthesis.cancel()
    setStatus('speaking')

    // Clean up emojis or asterisks
    const cleanedText = text.replace(/⚔️|🐲|🛡️|🌋|👾|🏁/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanedText)
    currentUtteranceRef.current = utterance

    // Configure deep gravelly dragon voice
    const voices = window.speechSynthesis.getVoices()
    
    // Attempt to find a deep male voice (e.g. Google UK English Male, Microsoft David, etc.)
    const preferredVoice = voices.find(v => 
      v.name.includes('Male') || 
      v.name.includes('David') || 
      v.name.includes('Google UK English') || 
      v.lang.startsWith('en')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    // Set slower speed and deep pitch for dragon-like delivery
    if (state === 'enraged') {
      utterance.rate = 0.88 // Fast growl
      utterance.pitch = 0.55
    } else if (state === 'weakened') {
      utterance.rate = 0.65 // Slow, heavy sigh
      utterance.pitch = 0.45
    } else {
      utterance.rate = 0.78 // Normal deep dragon speech
      utterance.pitch = 0.5
    }

    utterance.onend = () => {
      setStatus('idle')
    }
    utterance.onerror = () => {
      setStatus('idle')
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const speak = useCallback(
    async (text: string, state: BossState) => {
      if (!enabled || !text.trim()) return

      abortRef.current?.abort()
      cleanup()

      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')

      try {
        // Try ElevenLabs voice API
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, state }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          // If ElevenLabs fails (quota/payment req), fall back immediately to native browser TTS
          speakFallback(text, state)
          return
        }

        // Buffer the stream into a blob URL
        const blob = await response.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        urlRef.current = url

        const audio = new Audio(url)
        audio.crossOrigin = 'anonymous'
        audioRef.current = audio

        audio.onended = () => setStatus('idle')
        audio.onerror = () => {
          // Play fallback if audio play fails
          speakFallback(text, state)
        }

        setStatus('speaking')
        await audio.play().catch(() => {
          // Autoplay blocked fallback
          speakFallback(text, state)
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          speakFallback(text, state)
        }
      }
    },
    [cleanup, enabled, speakFallback],
  )

  // Ensure voices are loaded for Chrome/Safari
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  return {
    speak,
    stop,
    status,
    isSpeaking: status === 'speaking',
    isLoading: status === 'loading',
    isUnavailable: status === 'unavailable',
  }
}
