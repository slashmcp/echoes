'use client'

/**
 * useBossVoice
 *
 * Phase 2 upgrade: ElevenLabs audio is now routed through the Web Audio API:
 *
 *   MediaElementAudioSourceNode  →  AnalyserNode (fftSize: 256)  →  destination
 *
 * This enables frame-perfect audio-reactive lighting without any change in
 * audible behaviour. The exported `analyserRef` is polled each frame by
 * AudioReactiveLights via useFrame.
 *
 * Falls back to native speechSynthesis when ElevenLabs is unavailable; the
 * fallback path creates its own AudioContext path where possible.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BossState } from '@/lib/game/types'

type VoiceStatus = 'idle' | 'loading' | 'speaking' | 'unavailable'

export function useBossVoice(enabled: boolean) {
  const [status, setStatus] = useState<VoiceStatus>('idle')

  // Audio element for ElevenLabs playback
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const urlRef      = useRef<string | null>(null)
  const abortRef    = useRef<AbortController | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // ── Web Audio API graph ────────────────────────────────────────────────────
  // AudioContext is created lazily on first playback to satisfy browser
  // autoplay policies (context must be created inside a user-gesture handler).
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const analyserRef    = useRef<AnalyserNode | null>(null)
  const sourceNodeRef  = useRef<MediaElementAudioSourceNode | null>(null)

  /** Lazily create (or resume) the shared AudioContext and AnalyserNode. */
  function ensureAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256          // → 128 frequency bins
      analyser.smoothingTimeConstant = 0.8
      analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  /**
   * Connect an HTMLAudioElement to the AudioContext graph so AnalyserNode
   * receives real-time frequency data.
   * A single MediaElementAudioSourceNode is re-used per audio element to avoid
   * InvalidStateError from double-wrapping.
   */
  function connectAudioElement(audio: HTMLAudioElement) {
    const ctx = ensureAudioContext()
    const analyser = analyserRef.current!

    // Disconnect old source node if the audio element changed
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect() } catch { /* already disconnected */ }
      sourceNodeRef.current = null
    }

    const source = ctx.createMediaElementSource(audio)
    source.connect(analyser)
    sourceNodeRef.current = source
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
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
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect() } catch { /* ok */ }
      sourceNodeRef.current = null
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

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      analyserRef.current?.disconnect()
      void audioCtxRef.current?.close()
    }
  }, [])

  // ── Native Speech Synthesis Fallback ───────────────────────────────────────
  const speakFallback = useCallback((text: string, state: BossState) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setStatus('idle')
      return
    }

    window.speechSynthesis.cancel()
    setStatus('speaking')

    const cleanedText = text.replace(/⚔️|🐲|🛡️|🌋|👾|🏁/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanedText)
    currentUtteranceRef.current = utterance

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find((v) =>
      v.name.includes('Male') ||
      v.name.includes('David') ||
      v.name.includes('Google UK English') ||
      v.lang.startsWith('en')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    if (state === 'enraged') {
      utterance.rate = 0.88
      utterance.pitch = 0.55
    } else if (state === 'weakened') {
      utterance.rate = 0.65
      utterance.pitch = 0.45
    } else {
      utterance.rate = 0.78
      utterance.pitch = 0.5
    }

    utterance.onend = () => setStatus('idle')
    utterance.onerror = () => setStatus('idle')

    window.speechSynthesis.speak(utterance)
  }, [])

  // ── Primary ElevenLabs speak path ─────────────────────────────────────────
  const speak = useCallback(
    async (text: string, state: BossState) => {
      if (!enabled || !text.trim()) return

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

        if (!response.ok || !response.body) {
          speakFallback(text, state)
          return
        }

        const blob = await response.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        urlRef.current = url

        const audio = new Audio(url)
        audio.crossOrigin = 'anonymous'
        audioRef.current = audio

        // ── Web Audio API routing ──────────────────────────────────────────
        // Connect audio element into the AnalyserNode graph BEFORE playback
        // so frequency data is available from the very first frame.
        try {
          connectAudioElement(audio)
        } catch {
          // AudioContext may be unavailable in some environments — non-fatal
        }

        audio.onended = () => setStatus('idle')
        audio.onerror = () => speakFallback(text, state)

        setStatus('speaking')
        await audio.play().catch(() => speakFallback(text, state))
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          speakFallback(text, state)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleanup, enabled, speakFallback],
  )

  // Pre-load voices for Chrome/Safari
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
  }, [])

  return {
    speak,
    stop,
    status,
    isSpeaking:    status === 'speaking',
    isLoading:     status === 'loading',
    isUnavailable: status === 'unavailable',
    /** AnalyserNode ref — pass to AudioReactiveLights for frame-perfect sync */
    analyserRef,
  }
}
