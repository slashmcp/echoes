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
import { BlackDragon } from './black-dragon'
import { AudioReactiveLights } from './audio-reactive-lights'
import { Player } from './player'
import { Paladin } from './paladin'
// Alien removed
import { CrystalBall } from './crystal-ball'
import { DragonShieldItem } from './dragon-shield-item'

interface ArenaSceneProps {
  state: BossState
  isSpeaking: boolean
  wear: number
  analyserRef?: React.RefObject<AnalyserNode | null>
  onCrystalBallClick?: () => void
  hasDragonShield?: boolean
  onLootShield?: () => void
}

const EMBER_COUNT = 350

// Types for 3D Board
type CellType = 'empty' | 'player' | 'dragon' | 'chest' | 'trap' | 'goal'

// ── Preload floor texture at module level to prevent visual pop-in ─────────────
useTexture.preload('/Untitled design.png')
useTexture.preload('/WALL.png')

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

import { DungeonWall } from './dungeon-wall'
import { Torch } from './torch'

export const TILE_SIZE = 10

export const DUNGEON_LAYOUT = [
  'WWTWWTWWT', // 0
  'W.......W', // 1
  'T...P...T', // 2
  'W.......W', // 3
  'T.......T', // 4
  'W.......W', // 5
  'T.......T', // 6
  'W...P...W', // 7
  'WWT...TWW', // 8
  '  W...W  ', // 9
  '  T...T  ', // 10
  '  W...W  ', // 11
]

function DungeonMap() {
  const elements = []
  
  // Center the map around [0, 0, 0]
  const rows = DUNGEON_LAYOUT.length
  const cols = DUNGEON_LAYOUT[0].length
  const offsetX = (cols * TILE_SIZE) / 2 - (TILE_SIZE / 2)
  const offsetZ = (rows * TILE_SIZE) / 2 - (TILE_SIZE / 2)
  // Shift the Z forward so the dragon sits nicely in the big room
  const shiftZ = 0

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const char = DUNGEON_LAYOUT[z][x]
      if (char === ' ') continue

      const posX = x * TILE_SIZE - offsetX
      const posZ = z * TILE_SIZE - offsetZ + shiftZ

      // 1. Walls
      if (char === 'W' || char === 'T') {
        elements.push(
          <DungeonWall 
            key={`wall_${x}_${z}`} 
            position={[posX, 6, posZ]} // Raised so bottom is on floor
            size={[TILE_SIZE, 16, TILE_SIZE]} 
          />
        )
      }

      // 2. Torches (attached to walls)
      if (char === 'T') {
        // Simple logic to place torch on the face pointing towards the center of the room
        // If x is on the left half, point right. If on right half, point left.
        // If on the top half, point down. If on bottom half, point up.
        // We'll just place a torch slightly inside the wall block facing the nearest empty tile
        
        let torchRot: [number, number, number] = [0, 0, 0]
        let torchX = posX
        let torchZ = posZ
        const offset = TILE_SIZE / 2 + 0.1

        // Look around for an empty spot '.' to hang the torch
        if (x + 1 < cols && DUNGEON_LAYOUT[z][x+1] === '.') {
          torchX += offset
          torchRot = [0, -Math.PI / 2, 0]
        } else if (x - 1 >= 0 && DUNGEON_LAYOUT[z][x-1] === '.') {
          torchX -= offset
          torchRot = [0, Math.PI / 2, 0]
        } else if (z + 1 < rows && DUNGEON_LAYOUT[z+1][x] === '.') {
          torchZ += offset
          torchRot = [0, 0, 0]
        } else if (z - 1 >= 0 && DUNGEON_LAYOUT[z-1][x] === '.') {
          torchZ -= offset
          torchRot = [0, Math.PI, 0]
        }

        elements.push(
          <Torch 
            key={`torch_${x}_${z}`} 
            position={[torchX, 2, torchZ]} 
            rotation={torchRot} 
          />
        )
      }

      // 3. Pillars
      if (char === 'P') {
        elements.push(
          <Pillar 
            key={`pillar_${x}_${z}`} 
            position={[posX, -2, posZ]} 
            rotation={[0, Math.random() * Math.PI, 0]} 
          />
        )
      }
    }
  }

  return <group>{elements}</group>
}

// ── Phase 2: Arena Environment (Floor) ─────────────────────────────────
function ArenaEnvironment() {
  const { gl } = useThree()

  // PBR stone floor material
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

  useEffect(() => {
    return () => stoneMat.dispose()
  }, [stoneMat])

  return (
    <group>
      {/* PBR stone floor */}
      <mesh material={stoneMat} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 300]} />
      </mesh>
    </group>
  )
}

// AliensInTheDark removed

// ── ArenaScene (exported) ─────────────────────────────────────────────────────
export function ArenaScene({
  state,
  isSpeaking,
  wear,
  analyserRef,
  onCrystalBallClick,
  hasDragonShield,
  onLootShield,
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

      <DungeonMap />
      <ArenaEnvironment />
      {/* Aliens removed */}
      <Embers intensity={intensity} />
      {onCrystalBallClick && <CrystalBall position={[6, 0.6, 20]} onClick={onCrystalBallClick} />}
      {!hasDragonShield && onLootShield && (
        <DragonShieldItem position={[-8, -1, 10]} onLoot={onLootShield} />
      )}
      <Paladin hasDragonShield={hasDragonShield} />
      <BlackDragon state={state} isSpeaking={isSpeaking} wear={wear} />
    </>
  )
}
