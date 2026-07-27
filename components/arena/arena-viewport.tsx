'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'

import { MAX_BOSS_HEALTH } from '@/lib/game/content'
import { cn } from '@/lib/utils'
import type { BossState } from '@/lib/game/types'
import { ArenaScene } from './arena-scene'

interface ArenaViewportProps {
  state: BossState
  isSpeaking: boolean
  bossHealth: number
  shake: boolean
  showMap: boolean
  className?: string
}

export function ArenaViewport({
  state,
  isSpeaking,
  bossHealth,
  shake,
  showMap,
  className,
}: ArenaViewportProps) {
  const wear = 1 - Math.max(0, Math.min(1, bossHealth / MAX_BOSS_HEALTH))

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-obsidian',
        shake && 'animate-damage-shake',
        className,
      )}
    >
      <Canvas
        camera={{ position: [0, 1.2, 5.8], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
      >
        <Suspense fallback={null}>
          <ArenaScene state={state} isSpeaking={isSpeaking} wear={wear} showMap={showMap} />
        </Suspense>
        <OrbitControls 
          enableZoom={true} 
          minDistance={2} 
          maxDistance={12} 
          minPolarAngle={0.2} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          enablePan={true}
        />
      </Canvas>

      {/* Enraged heat wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: state === 'enraged' ? 0.3 : state === 'irritated' ? 0.12 : 0,
          background:
            'radial-gradient(circle at 50% 62%, oklch(0.58 0.22 30 / 65%) 0%, transparent 68%)',
        }}
      />

      {/* Weakened desaturation veil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: state === 'weakened' || state === 'defeated' ? 0.45 : 0,
          background:
            'linear-gradient(180deg, oklch(0.16 0.01 240 / 70%) 0%, oklch(0.1 0.005 240 / 40%) 100%)',
        }}
      />

      {/* Vignette + scanline for that CRT-cinematic feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 45%, oklch(0 0 0 / 72%) 100%)',
        }}
      />
      <div aria-hidden className="scanline-veil pointer-events-none absolute inset-0 opacity-25" />
    </div>
  )
}
