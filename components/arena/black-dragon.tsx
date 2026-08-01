'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame, useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { GLTF, SkeletonUtils } from 'three-stdlib'

import type { BossState } from '@/lib/game/types'

type BlackDragonProps = JSX.IntrinsicElements['group'] & {
  state: BossState
  isSpeaking: boolean
  wear: number
}

const STATE_COLORS: Record<BossState, { emissiveColor: string; emissiveIntensity: number }> = {
  cocky: { emissiveColor: '#8a2be2', emissiveIntensity: 0.1 }, // Purple glow for cocky
  irritated: { emissiveColor: '#4b0082', emissiveIntensity: 0.2 },
  enraged: { emissiveColor: '#ff00ff', emissiveIntensity: 0.4 }, // Magenta for enraged
  weakened: { emissiveColor: '#4a0e4e', emissiveIntensity: 0.05 },
  defeated: { emissiveColor: '#1a051a', emissiveIntensity: 0.01 },
}

type ActionName = 'Scene'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    Plane_Material_0: THREE.Mesh
    Object_244: THREE.SkinnedMesh
    Object_245: THREE.SkinnedMesh
    Object_246: THREE.SkinnedMesh
    _rootJoint: THREE.Bone
  }
  materials: {
    Material: THREE.MeshStandardMaterial
    EYES: THREE.MeshStandardMaterial
    Game_dragon: THREE.MeshPhysicalMaterial
    ['Game_dragon.001']: THREE.MeshPhysicalMaterial
  }
  animations: GLTFAction[]
}

export function BlackDragon({ state, isSpeaking, wear, ...props }: BlackDragonProps) {
  const group = useRef<THREE.Group>(null)
  
  const { scene, animations } = useGLTF('/black_dragon_with_idle_animation.glb')
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene])
  
  // Bind animations directly to the cloned scene so the mixer finds the bones correctly
  const { actions, mixer } = useAnimations(animations, clonedScene)

  const palette = STATE_COLORS[state]

  useEffect(() => {
    if (actions && actions['Scene']) {
      actions['Scene'].reset().fadeIn(0.5).play()
    }
  }, [actions])

  useEffect(() => {
    // Traverse the scene to apply shadows and dynamic materials
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        // Hide the baked-in floating platform
        if (child.name.includes('Plane')) {
          child.visible = false
          return
        }

        child.castShadow = true
        child.receiveShadow = true

        if (child.name === 'Object_244' && child.material) {
          // EYES - Keep the emissive glow for eyes
          const mat = child.material as THREE.MeshStandardMaterial
          mat.emissive = new THREE.Color(palette.emissiveColor)
          mat.emissiveIntensity = palette.emissiveIntensity * 10
        }
        
        // Removed the body emissive override so it stops looking like a flat purple balloon
      }
    })
  }, [clonedScene, palette])

  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime
    const collapsed = state === 'defeated'
    const agitation = state === 'enraged' ? 2.5 : state === 'irritated' ? 1.5 : 1

    // Look-at coordinates from mouse pointer
    let targetX = frameState.pointer.x * 0.35
    let targetY = frameState.pointer.y * 0.25

    // Look-at coordinates from Xbox Gamepad if connected
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    const gamepad = Array.from(gamepads).find(g => g !== null)
    if (gamepad && gamepad.axes) {
      const stickX = gamepad.axes[0]
      const stickY = -gamepad.axes[1]
      
      if (Math.abs(stickX) > 0.1 || Math.abs(stickY) > 0.1) {
        targetX = stickX * 0.45
        targetY = stickY * 0.35
      }
    }

    if (group.current) {
      // Remove the rigid bobbing translation (home-baked animation)
      // Just keep the state-based slump
      group.current.position.y = -1.6 - wear * 0.65 - (collapsed ? 0.8 : 0)
      
      const targetRotX = collapsed ? 0.35 : wear * 0.15 - targetY
      const targetRotY = collapsed ? 0 : targetX
      const targetRotZ = collapsed ? 0.25 : wear * 0.06

      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.08)
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.08)
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetRotZ, 0.08)
    }
  })

  return (
    <group ref={group} position={[0, -1.8, 1.2]} {...props} dispose={null}>
      <primitive 
        object={clonedScene} 
        scale={0.6} 
        position={[0, 0, 0]} 
        rotation={[0, -Math.PI / 2, 0]} 
      />
    </group>
  )
}

useGLTF.preload('/black_dragon_with_idle_animation.glb')
