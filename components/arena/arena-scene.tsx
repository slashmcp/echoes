'use client'

/**
 * ArenaScene — Phase 2
 *
 * Upgrades applied:
 *  - LavaFloor: custom GLSL LavaMaterial (simplex-noise vertex displacement +
 *    fragment colour bands). PointLight above lava modulated by the same uTime.
 *  - PlayableBoard3D: 49 individual meshes → single InstancedFloor draw call.
 *    Includes @react-three/drei <Grid> overlay with polygonOffset Z-fight fix.
 *  - Stone floor: PBR meshStandardMaterial with RepeatWrapping + LinearMipmapLinearFilter.
 *  - AudioReactiveLights replaces hardcoded pointLight rigs.
 *  - VRAM lifecycle: all custom ShaderMaterial instances disposed on unmount.
 */

import { useFrame, extend, useThree } from '@react-three/fiber'
import { Preload, useGLTF, useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { STATE_META } from '@/lib/game/content'
import type { BossState } from '@/lib/game/types'
import { IgnisDragon } from './ignis-dragon'
import { AudioReactiveLights } from './audio-reactive-lights'
import { Warrior } from './warrior'

interface ArenaSceneProps {
  state: BossState
  isSpeaking: boolean
  wear: number
  analyserRef?: React.RefObject<AnalyserNode | null>
}

const EMBER_COUNT = 350

// Types for 3D Board
type CellType = 'empty' | 'player' | 'dragon' | 'chest' | 'trap' | 'goal'

// ── Preload floor texture at module level to prevent visual pop-in ─────────────
useTexture.preload('/Untitled design.png')

// ── Embers (unchanged from Phase 1) ──────────────────────────────────────────
function Embers({ intensity }: { intensity: number }) {
  const points = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3)
    const speeds = new Float32Array(EMBER_COUNT)
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      positions[i * 3]     = (Math.random() - 0.5) * 22
      positions[i * 3 + 1] = Math.random() * 16 - 4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
      speeds[i] = 0.35 + Math.random() * 1.1
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    const geometry = points.current?.geometry
    if (!geometry) return
    const attr  = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      array[i * 3 + 1] += speeds[i] * delta * (0.7 + intensity * 0.6)
      array[i * 3]     += Math.sin(array[i * 3 + 1] * 0.6 + i) * delta * 0.22
      if (array[i * 3 + 1] > 12) {
        array[i * 3 + 1] = -5
        array[i * 3]     = (Math.random() - 0.5) * 22
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#ff6611"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function Pillar({ position, rotation }: { position: [number, number, number], rotation?: [number, number, number] }) {
  const { scene } = useGLTF('/pillar.glb')
  const clone = useMemo(() => scene.clone(), [scene])
  return <primitive object={clone} position={position} rotation={rotation || [0, 0, 0]} />
}

function Pillars() {
  const pillars = useMemo(() => {
    const arr = []
    const spacing = 8
    const width = 6
    // Generate pillars from z = 45 down to z = -10
    for (let z = 45; z >= -10; z -= spacing) {
      // Left pillar
      arr.push({
        position: [-width, -2, z] as [number, number, number],
        rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
      })
      // Right pillar
      arr.push({
        position: [width, -2, z] as [number, number, number],
        rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
      })
    }
    return arr
  }, [])

  return (
    <group>
      {pillars.map((p, i) => (
        <Pillar key={i} position={p.position} rotation={p.rotation} />
      ))}
    </group>
  )
}
useGLTF.preload('/pillar.glb')

// ── Phase 2: Arena Environment (Floor & Wall) ─────────────────────────────────
function ArenaEnvironment() {
  const { gl } = useThree()

  // PBR stone floor material with correct texture settings
  const floorTex = useTexture('/Untitled design.png')
  const stoneMat = useMemo(() => {
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(52, 52)
    floorTex.minFilter = THREE.LinearMipMapLinearFilter
    floorTex.magFilter = THREE.LinearFilter
    floorTex.anisotropy = gl.capabilities.getMaxAnisotropy()
    floorTex.needsUpdate = true

    return new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.1,
      color: '#ffffff',
    })
  }, [floorTex, gl])

  useEffect(() => () => stoneMat.dispose(), [stoneMat])

  return (
    <group>
      {/* PBR stone floor — expanded for free-roaming */}
      <mesh material={stoneMat} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
      </mesh>
    </group>
  )
}
// ── ArenaScene (exported) ─────────────────────────────────────────────────────
export function ArenaScene({
  state,
  isSpeaking,
  wear,
  analyserRef,
}: ArenaSceneProps) {
  const intensity = STATE_META[state].glow

  return (
    <>
      <color attach="background" args={['#120503']} />
      <fog attach="fog" args={['#120503', 3, 14]} />

      <ambientLight intensity={0.5} color="#ffffff" />
      <hemisphereLight args={['#222222', '#050505', 0.6]} />
      {/* Front light to illuminate model textures */}
      <directionalLight position={[0, 4, 10]} intensity={0.85} color="#ffffff" />

      {/* ── Phase 2: Audio-reactive lighting rig ──────────────────────────── */}
      <AudioReactiveLights
        analyserRef={analyserRef ?? { current: null }}
        baseIntensity={intensity}
      />

      <Pillars />
      <ArenaEnvironment />
      <Embers intensity={intensity} />
      <Warrior />
      <IgnisDragon state={state} isSpeaking={isSpeaking} wear={wear} />
    </>
  )
}
