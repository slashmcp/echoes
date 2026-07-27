'use client'

import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { BossState } from '@/lib/game/types'

interface IgnisDragonProps {
  state: BossState
  isSpeaking: boolean
  /** 0..1 — drives how far the silhouette slumps as he loses. */
  wear: number
}

const STATE_COLORS: Record<BossState, { emissiveColor: string; emissiveIntensity: number }> = {
  cocky: { emissiveColor: '#ff8800', emissiveIntensity: 0.05 },
  irritated: { emissiveColor: '#ff4400', emissiveIntensity: 0.12 },
  enraged: { emissiveColor: '#ff0000', emissiveIntensity: 0.28 },
  weakened: { emissiveColor: '#8a4422', emissiveIntensity: 0.02 },
  defeated: { emissiveColor: '#2b1b11', emissiveIntensity: 0.005 },
}

export function IgnisDragon({ state, isSpeaking, wear }: IgnisDragonProps) {
  const group = useRef<THREE.Group>(null)
  
  // Load the full-body dragon GLB model
  const { scene } = useGLTF('/red_dragon.glb')
  
  // Clone the scene so we don't mutate shared cached instances
  const clonedScene = useMemo(() => scene.clone(), [scene])

  const palette = STATE_COLORS[state]

  // Find the mesh inside the scene to manipulate its materials
  const dragonMesh = useMemo(() => {
    let mesh: THREE.Mesh | null = null
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        mesh = child
        // Enable shadows
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return mesh
  }, [clonedScene])

  // Custom dynamic rotation and breathing animation
  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime
    const collapsed = state === 'defeated'
    const agitation = state === 'enraged' ? 3.4 : state === 'irritated' ? 1.9 : 1

    // Look-at coordinates from mouse pointer
    let targetX = frameState.pointer.x * 0.35
    let targetY = frameState.pointer.y * 0.25

    // Look-at coordinates from Xbox Gamepad if connected
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    const gamepad = Array.from(gamepads).find(g => g !== null)
    if (gamepad && gamepad.axes) {
      const stickX = gamepad.axes[0] // Left stick horizontal
      const stickY = -gamepad.axes[1] // Left stick vertical (inverted for WebGL)
      
      // If the stick is moved beyond a deadzone, override mouse tracking
      if (Math.abs(stickX) > 0.1 || Math.abs(stickY) > 0.1) {
        targetX = stickX * 0.45
        targetY = stickY * 0.35
      }
    }

    if (group.current) {
      // Breathing animation
      const breathe = Math.sin(t * (0.55 * agitation)) * (collapsed ? 0.02 : 0.06)
      
      // Slump posture based on wear (pull back and down more as he is defeated)
      group.current.position.y = -1.6 + breathe - wear * 0.65 - (collapsed ? 0.8 : 0)
      
      // Combine state-based slump with dynamic look-at tracking
      const targetRotX = collapsed ? 0.35 : wear * 0.15 - targetY
      const targetRotY = collapsed ? 0 : targetX
      const targetRotZ = collapsed ? 0.25 : Math.sin(t * 0.22) * 0.02 + wear * 0.06

      // Smoothly interpolate current rotation to target rotation
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.08)
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.08)
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetRotZ, 0.08)
    }

    // Throb / speaking animation
    if (dragonMesh && dragonMesh.material) {
      const materials = Array.isArray(dragonMesh.material)
        ? dragonMesh.material
        : [dragonMesh.material]

      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          const speakThrob = isSpeaking ? 1.3 + Math.abs(Math.sin(t * 11)) * 0.45 : 1.0
          const rageThrob = state === 'enraged' ? 1 + Math.sin(t * 9) * 0.3 : 1
          
          mat.emissive = new THREE.Color(palette.emissiveColor)
          mat.emissiveIntensity = palette.emissiveIntensity * speakThrob * rageThrob
        }
      })
    }
  })

  return (
    <group ref={group} position={[0, -1.8, 1.2]} rotation={[0, 0, 0]}>
      {/* Position and scale full-body GLB model appropriately. */}
      <primitive 
        object={clonedScene} 
        scale={22.0} 
        position={[0, 0.1, 0]} 
        rotation={[0.02, 0.4, 0]} 
      />
    </group>
  )
}

// Preload the GLB model
useGLTF.preload('/red_dragon.glb')
