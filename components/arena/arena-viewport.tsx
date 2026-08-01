'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'

import { MAX_BOSS_HEALTH } from '@/lib/game/content'
import { cn } from '@/lib/utils'
import type { BossState } from '@/lib/game/types'
import { ArenaScene, DUNGEON_LAYOUT, TILE_SIZE } from './arena-scene'

interface ArenaViewportProps {
  state: BossState
  isSpeaking: boolean
  bossHealth: number
  shake: boolean
  onEncounterDragon?: () => void
  onCrystalBallClick?: () => void
  hasDragonShield?: boolean
  onLootShield?: () => void
  /** AnalyserNode ref from useBossVoice — drives audio-reactive lighting */
  analyserRef?: React.RefObject<AnalyserNode | null>
  className?: string
}

function WASDControls({ controlsRef, onEncounterDragon }: { controlsRef: React.RefObject<any>, onEncounterDragon?: () => void }) {
  const { camera } = useThree()
  const moveState = useRef({ forward: 0, right: 0 })
  const hasEncountered = useRef(false)

  useEffect(() => {
    const handleTeleport = () => {
      camera.position.set(0, 1.2, 12)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 1.2, 11.9)
        controlsRef.current.update()
      }
    }
    window.addEventListener('teleport-dragon', handleTeleport)
    return () => window.removeEventListener('teleport-dragon', handleTeleport)
  }, [camera, controlsRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in chat
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') moveState.current.forward = 1
      if (key === 's' || key === 'arrowdown') moveState.current.forward = -1
      if (key === 'a' || key === 'arrowleft') moveState.current.right = -1
      if (key === 'd' || key === 'arrowright') moveState.current.right = 1
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') {
        if (moveState.current.forward === 1) moveState.current.forward = 0
      }
      if (key === 's' || key === 'arrowdown') {
        if (moveState.current.forward === -1) moveState.current.forward = 0
      }
      if (key === 'a' || key === 'arrowleft') {
        if (moveState.current.right === -1) moveState.current.right = 0
      }
      if (key === 'd' || key === 'arrowright') {
        if (moveState.current.right === 1) moveState.current.right = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!controlsRef.current) return

    let { forward, right } = moveState.current
    let rightStickX = 0
    let rightStickY = 0

    // Gamepad support
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    const gp = Array.from(gamepads).find(g => g !== null)
    if (gp?.axes) {
      const deadzone = 0.1
      // Left stick Y axis (forward/backward)
      if (Math.abs(gp.axes[1]) > deadzone) forward -= gp.axes[1] 
      // Left stick X axis (left/right)
      if (Math.abs(gp.axes[0]) > deadzone) right += gp.axes[0]
      
      // Right stick X axis (look left/right)
      if (Math.abs(gp.axes[2]) > deadzone) rightStickX = gp.axes[2]
      // Right stick Y axis (look up/down)
      if (Math.abs(gp.axes[3]) > deadzone) rightStickY = gp.axes[3]
      
      // Clamp values
      forward = Math.max(-1, Math.min(1, forward))
      right = Math.max(-1, Math.min(1, right))
    }

    if (forward === 0 && right === 0 && rightStickX === 0 && rightStickY === 0) return

    if (forward !== 0 || right !== 0) {
      const speed = 7.0 * delta // Movement speed

      // Get camera's forward direction on the XZ plane
      const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      forwardVector.y = 0
      if (forwardVector.lengthSq() > 0.001) forwardVector.normalize()

      // Get right direction
      const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      rightVector.y = 0
      if (rightVector.lengthSq() > 0.001) rightVector.normalize()

      // Combine for movement
      const movement = new THREE.Vector3()
      if (forward !== 0) movement.addScaledVector(forwardVector, forward * speed)
      if (right !== 0) movement.addScaledVector(rightVector, right * speed)

      const newPos = camera.position.clone().add(movement)

      // Collision Check
      const rows = DUNGEON_LAYOUT.length
      const cols = DUNGEON_LAYOUT[0].length
      const offsetX = (cols * TILE_SIZE) / 2 - (TILE_SIZE / 2)
      const offsetZ = (rows * TILE_SIZE) / 2 - (TILE_SIZE / 2)
      const shiftZ = 0
      
      const gridX = Math.round((newPos.x + offsetX) / TILE_SIZE)
      const gridZ = Math.round((newPos.z - shiftZ + offsetZ) / TILE_SIZE)
      
      let canMove = true
      // Only block if we hit a wall or torch tile
      if (gridZ >= 0 && gridZ < rows && gridX >= 0 && gridX < cols) {
         const char = DUNGEON_LAYOUT[gridZ][gridX]
         if (char === 'W' || char === 'T') canMove = false
      } else {
         // Prevent wandering outside the map entirely
         canMove = false
      }

      if (canMove) {
        camera.position.copy(newPos)
        controlsRef.current.target.add(movement)
      }
    }

    if (rightStickX !== 0 || rightStickY !== 0) {
      const lookSpeed = 2.0 * delta
      const lookDir = new THREE.Vector3().subVectors(controlsRef.current.target, camera.position)
      
      if (rightStickX !== 0) {
        lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rightStickX * lookSpeed)
      }
      
      if (rightStickY !== 0) {
        const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        lookDir.applyAxisAngle(rightAxis, -rightStickY * lookSpeed)
      }
      
      controlsRef.current.target.copy(camera.position).add(lookDir)
    }

    // Check distance for encounter
    if (!hasEncountered.current && camera.position.z < 15) {
      hasEncountered.current = true
      onEncounterDragon?.()
    }
  })

  return null
}

export function ArenaViewport({
  state,
  isSpeaking,
  bossHealth,
  shake,
  onEncounterDragon,
  onCrystalBallClick,
  hasDragonShield,
  onLootShield,
  analyserRef,
  className,
}: ArenaViewportProps) {
  const wear = 1 - Math.max(0, Math.min(1, bossHealth / MAX_BOSS_HEALTH))
  const controlsRef = useRef<any>(null)

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-obsidian',
        shake && 'animate-damage-shake',
        className,
      )}
    >
      <Canvas
        camera={{ position: [0, 1.2, 40], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
      >
        <Suspense fallback={null}>
          <ArenaScene
            state={state}
            isSpeaking={isSpeaking}
            wear={wear}
            analyserRef={analyserRef}
            onCrystalBallClick={onCrystalBallClick}
            hasDragonShield={hasDragonShield}
            onLootShield={onLootShield}
          />
        </Suspense>
        <WASDControls controlsRef={controlsRef} onEncounterDragon={onEncounterDragon} />
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.2, 39.9]}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI - 0.1}
          makeDefault
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

      {/* Vignette + scanline cinematic overlay */}
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
