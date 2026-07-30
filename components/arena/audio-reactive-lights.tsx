'use client'

/**
 * AudioReactiveLights
 *
 * A React Three Fiber component containing the boss encounter lighting rig.
 * Each frame it polls the Web Audio AnalyserNode (provided as a ref), isolates
 * the bass frequency band (bins 0–8 of 128), applies an Exponential Moving
 * Average (EMA) for smooth, organic transitions, and drives THREE.PointLight
 * intensities directly — zero React state mutations inside the loop.
 *
 * Props:
 *   analyserRef  — React.RefObject<AnalyserNode | null> exported by useBossVoice
 *   baseIntensity — static ambient intensity when no audio is playing (0..1)
 */

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

interface AudioReactiveLightsProps {
  analyserRef: React.RefObject<AnalyserNode | null>
  /** Scalar 0..1 — overall brightness driven by boss state (passed from ArenaScene) */
  baseIntensity?: number
}

export function AudioReactiveLights({
  analyserRef,
  baseIntensity = 0.5,
}: AudioReactiveLightsProps) {
  // Direct refs to Three.js light objects — mutated in useFrame, never via state
  const keyLightRef  = useRef<THREE.PointLight>(null)
  const fillLightRef = useRef<THREE.PointLight>(null)
  const lavaLightRef = useRef<THREE.PointLight>(null)

  // Pre-allocated frequency data buffer — reused every frame to avoid GC pressure
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // EMA state — persisted across frames in a plain ref
  const smoothedRef = useRef(0)

  useFrame(() => {
    const analyser = analyserRef.current
    const keyLight  = keyLightRef.current
    const fillLight = fillLightRef.current
    const lavaLight = lavaLightRef.current
    if (!keyLight || !fillLight || !lavaLight) return

    // ── Compute normalized scalar from audio data ──────────────────────────
    let normalized = 0

    if (analyser) {
      // Allocate buffer lazily (matches analyser.frequencyBinCount = 128)
      if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      }
      analyser.getByteFrequencyData(dataArrayRef.current)

      // Isolate bass band (bins 0–8 ≈ 20–250 Hz for fftSize 256)
      let sum = 0
      const BASS_BINS = 9
      for (let i = 0; i < BASS_BINS; i++) {
        sum += dataArrayRef.current[i]
      }
      const rawAvg = sum / BASS_BINS        // 0..255
      normalized = rawAvg / 255             // 0..1

      // EMA smoothing: α=0.15 → slow organic transitions (strobing prevention)
      smoothedRef.current = 0.85 * smoothedRef.current + 0.15 * normalized
    } else {
      // No audio — smoothly decay to zero
      smoothedRef.current = 0.85 * smoothedRef.current
    }

    const s = smoothedRef.current

    // ── Apply to lights ────────────────────────────────────────────────────
    // Key light: pulses with voice amplitude; base driven by boss state intensity
    keyLight.intensity = (baseIntensity * 12 + 4) + s * 28

    // Fill light: subtler reactive fill from the side
    fillLight.intensity = 3 + s * 8

    // Lava light: flickers in sync with audio, creating the impression that
    // Ignis's speech disturbs the molten rock below
    lavaLight.intensity = (baseIntensity * 3 + 0.8) + s * 6
  })

  return (
    <>
      {/* Key light — classic villain uplighting from the lava fissure */}
      <pointLight
        ref={keyLightRef}
        position={[0, 9, 7]}
        color="#ff7a22"
        intensity={baseIntensity * 12 + 4}
        distance={40}
        castShadow
      />

      {/* Fill light — side fill to prevent harsh shadows */}
      <pointLight
        ref={fillLightRef}
        position={[-8, 4, 4]}
        color="#ff3b00"
        intensity={3}
        distance={22}
      />

      {/* Lava light — sits just above the lava chasm, flickers with audio */}
      <pointLight
        ref={lavaLightRef}
        position={[0, -1.2, -1.8]}
        color="#ff4400"
        intensity={baseIntensity * 3 + 0.8}
        distance={18}
      />
    </>
  )
}
