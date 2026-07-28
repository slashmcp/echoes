'use client'

import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { STATE_META } from '@/lib/game/content'
import type { BossState } from '@/lib/game/types'
import { IgnisDragon } from './ignis-dragon'
import { soundManager } from '@/lib/audio/sound-manager'

interface ArenaSceneProps {
  state: BossState
  isSpeaking: boolean
  wear: number
  showMap: boolean
}

const EMBER_COUNT = 350
const GRID_SIZE = 7

// Types for 3D Board
type CellType = 'empty' | 'player' | 'dragon' | 'chest' | 'trap' | 'goal'
interface Tile3D {
  x: number
  y: number
  type: CellType
  explored: boolean
}

// 3D Playable Board Component
function PlayableBoard3D() {
  const floorTexture = useTexture('/Untitled design.png')
  const [playerPos, setPlayerPos] = useState({ x: 3, y: 6 })
  const [grid, setGrid] = useState<Tile3D[]>([])

  // Initialize board state representing a 7x7 dark grid
  useEffect(() => {
    const tiles: Tile3D[] = []
    const dragonPos = { x: 3, y: 0 }
    const goalPos = { x: 3, y: 6 }
    const chestPositions = [
      { x: 1, y: 2 },
      { x: 5, y: 3 }
    ]
    const trapPositions = [
      { x: 2, y: 4 },
      { x: 4, y: 2 }
    ]

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let type: CellType = 'empty'

        if (x === playerPos.x && y === playerPos.y) {
          type = 'player'
        } else if (x === dragonPos.x && y === dragonPos.y) {
          type = 'dragon'
        } else if (x === goalPos.x && y === goalPos.y) {
          type = 'goal'
        } else if (chestPositions.some(p => p.x === x && p.y === y)) {
          type = 'chest'
        } else if (trapPositions.some(p => p.x === x && p.y === y)) {
          type = 'trap'
        }

        tiles.push({
          x,
          y,
          type,
          explored: x === playerPos.x && y === playerPos.y
        })
      }
    }
    setGrid(tiles)
  }, [])

  function movePlayer(dx: number, dy: number) {
    const nextX = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + dx))
    const nextY = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + dy))

    if (nextX === playerPos.x && nextY === playerPos.y) return

    setPlayerPos({ x: nextX, y: nextY })
    soundManager.playTick()

    // Move player and update explored status of cells
    setGrid(prev => prev.map(tile => {
      let nextType = tile.type
      if (tile.x === playerPos.x && tile.y === playerPos.y) {
        nextType = 'empty'
        if (tile.x === 3 && tile.y === 6) nextType = 'goal'
      }

      if (tile.x === nextX && tile.y === nextY) {
        const wasExplored = tile.explored
        
        if (tile.type === 'chest' && !wasExplored) {
          soundManager.playMessagePop()
        } else if (tile.type === 'trap' && !wasExplored) {
          soundManager.playDamageImpact()
        } else if (tile.type === 'dragon' && !wasExplored) {
          soundManager.playDragonRoar()
        }

        return {
          ...tile,
          type: 'player',
          explored: true
        }
      }

      return {
        ...tile,
        type: nextType
      }
    }))
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault()
        movePlayer(0, -1)
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault()
        movePlayer(0, 1)
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault()
        movePlayer(-1, 0)
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault()
        movePlayer(1, 0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerPos, grid])

  // Controller polling
  useEffect(() => {
    let active = true
    let cooldown = false

    function pollController() {
      if (!active) return
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const gamepad = Array.from(gamepads).find(g => g !== null)
      
      if (gamepad && gamepad.axes && !cooldown) {
        const x = gamepad.axes[0]
        const y = gamepad.axes[1]

        if (y < -0.5) {
          movePlayer(0, -1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (y > 0.5) {
          movePlayer(0, 1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x < -0.5) {
          movePlayer(-1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x > 0.5) {
          movePlayer(1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        }
      }
      requestAnimationFrame(pollController)
    }

    pollController()
    return () => { active = false }
  }, [playerPos, grid])

  return (
    <group position={[0, -0.2, 0]} rotation={[0.12, 0, 0]}>
      {/* 3D Board Base Tabletop */}
      <mesh receiveShadow position={[0, -0.92, 0]}>
        <boxGeometry args={[4.8, 0.08, 4.8]} />
        <meshStandardMaterial color="#1a120c" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Render 49 cells in 3D */}
      {grid.map((tile, idx) => {
        const localX = (tile.x - 3) * 0.62
        const localZ = (tile.y - 3) * 0.62
        const isPlayer = tile.type === 'player'
        const isExplored = tile.explored

        return (
          <group key={`${tile.x}-${tile.y}-${idx}`}>
            {/* Basalt stone slab tile with custom texture map */}
            <mesh 
              receiveShadow 
              castShadow 
              position={[localX, -0.87, localZ]}
            >
              <boxGeometry args={[0.56, 0.06, 0.56]} />
              <meshStandardMaterial 
                map={floorTexture}
                color={isExplored ? (isPlayer ? "#ffa466" : "#ffffff") : "#22110c"} 
                roughness={0.65} 
                metalness={0.25}
                emissive={isPlayer ? "#d97736" : "#000000"}
                emissiveIntensity={isPlayer ? 0.25 : 0}
              />
            </mesh>

            {/* Fog of War (Unexplored black smoke column) */}
            {!isExplored && (
              <mesh position={[localX, -0.5, localZ]}>
                <boxGeometry args={[0.55, 0.7, 0.55]} />
                <meshStandardMaterial 
                  color="#000000" 
                  transparent 
                  opacity={0.92}
                  roughness={1.0}
                />
              </mesh>
            )}

            {/* Explorations tokens */}
            {isExplored && (
              <group position={[localX, -0.84, localZ]}>
                {/* Player Token: Bouncing copper chess-pawn */}
                {isPlayer && (
                  <mesh castShadow position={[0, 0.22, 0]}>
                    <coneGeometry args={[0.18, 0.38, 8]} />
                    <meshStandardMaterial 
                      color="#d97736" 
                      metalness={0.8} 
                      roughness={0.2}
                      emissive="#d97736"
                      emissiveIntensity={0.25}
                    />
                  </mesh>
                )}

                {/* Dragon Goal Token: Glowing red skull */}
                {tile.type === 'dragon' && (
                  <mesh castShadow position={[0, 0.16, 0]}>
                    <sphereGeometry args={[0.16, 8, 8]} />
                    <meshStandardMaterial 
                      color="#ef4444" 
                      emissive="#ef4444" 
                      emissiveIntensity={0.7}
                    />
                  </mesh>
                )}

                {/* Chest Token: Glowing blue gem */}
                {tile.type === 'chest' && (
                  <mesh castShadow position={[0, 0.14, 0]}>
                    <octahedronGeometry args={[0.12]} />
                    <meshStandardMaterial 
                      color="#60a5fa" 
                      emissive="#60a5fa" 
                      emissiveIntensity={0.65}
                    />
                  </mesh>
                )}

                {/* Trap Token: Lava warning geyser */}
                {tile.type === 'trap' && (
                  <mesh castShadow position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.12, 0.18, 0.2, 6]} />
                    <meshStandardMaterial 
                      color="#ea580c" 
                      emissive="#ea580c" 
                      emissiveIntensity={0.8}
                    />
                  </mesh>
                )}

                {/* Goal Token: Start Flag/Marker */}
                {tile.type === 'goal' && (
                  <mesh castShadow position={[0, 0.12, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.24, 8]} />
                    <meshStandardMaterial color="#888888" roughness={0.7} />
                  </mesh>
                )}
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Embers({ intensity }: { intensity: number }) {
  const points = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(EMBER_COUNT * 3)
    const speeds = new Float32Array(EMBER_COUNT)
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 22
      positions[i * 3 + 1] = Math.random() * 16 - 4
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
      speeds[i] = 0.35 + Math.random() * 1.1
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    const geometry = points.current?.geometry
    if (!geometry) return
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      array[i * 3 + 1] += speeds[i] * delta * (0.7 + intensity * 0.6)
      array[i * 3] += Math.sin(array[i * 3 + 1] * 0.6 + i) * delta * 0.22
      if (array[i * 3 + 1] > 12) {
        array[i * 3 + 1] = -5
        array[i * 3] = (Math.random() - 0.5) * 22
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

function Pillars() {
  const material = new THREE.MeshStandardMaterial({
    color: '#080504',
    roughness: 0.95,
  })

  return (
    <group>
      <mesh material={material} position={[-4, 2, -6]}>
        <cylinderGeometry args={[0.3, 0.45, 12, 6]} />
      </mesh>
      <mesh material={material} position={[4, 2, -6]}>
        <cylinderGeometry args={[0.3, 0.45, 12, 6]} />
      </mesh>
      <mesh material={material} position={[-7, 2, -2]}>
        <cylinderGeometry args={[0.4, 0.6, 12, 6]} />
      </mesh>
      <mesh material={material} position={[7, 2, -2]}>
        <cylinderGeometry args={[0.4, 0.6, 12, 6]} />
      </mesh>
    </group>
  )
}

function LavaFloor({ intensity }: { intensity: number }) {
  const material = new THREE.MeshStandardMaterial({
    color: '#0d0402',
    roughness: 0.95,
  })

  return (
    <group>
      {/* Basalt stone floor */}
      <mesh material={material} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 36]} />
      </mesh>

      {/* Lava fissure split in center */}
      <mesh position={[0, -1.98, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 14]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff4400"
          emissiveIntensity={intensity * 4.5 + 1.2}
          roughness={0.9}
        />
      </mesh>

      {/* Back wall */}
      <mesh material={material} position={[0, 3, -11]}>
        <planeGeometry args={[46, 26]} />
      </mesh>
    </group>
  )
}

export function ArenaScene({ state, isSpeaking, wear, showMap }: ArenaSceneProps) {
  const intensity = STATE_META[state].glow

  return (
    <>
      <color attach="background" args={['#120503']} />
      <fog attach="fog" args={['#120503', 3, 14]} />

      <ambientLight intensity={0.5} color="#ffffff" />
      <hemisphereLight args={['#222222', '#050505', 0.6]} />
      {/* Front light to illuminate the model textures */}
      <directionalLight position={[0, 4, 10]} intensity={2.8} color="#ffffff" />
      
      {/* Key light from the fissure below — classic villain uplighting */}
      <spotLight
        position={[0, 9, 7]}
        angle={0.7}
        penumbra={0.9}
        intensity={intensity * 12 + 4}
        color="#ff7a22"
        castShadow
      />
      <pointLight position={[-8, 4, 4]} intensity={3} color="#ff3b00" distance={22} />

      {showMap ? (
        // Render 3D board instead of the normal boss scene
        <PlayableBoard3D />
      ) : (
        // Normal Boss duel scene
        <>
          <Pillars />
          <LavaFloor intensity={intensity} />
          <Embers intensity={intensity} />
          <IgnisDragon state={state} isSpeaking={isSpeaking} wear={wear} />
        </>
      )}
    </>
  )
}
