'use client'

import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGamepad } from '@/hooks/use-gamepad'

interface WarriorProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}

export function Warrior({ position = [0, -2, 12], rotation = [0, Math.PI, 0], scale = 1 }: WarriorProps) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/Untitled.glb')
  const { actions } = useAnimations(animations, group)
  
  // This hook ensures we listen to gamepad connection events
  const gamepadState = useGamepad()

  const [currentAnim, setCurrentAnim] = useState<string | null>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  // Start with Idle (or fallback to whatever animation exists)
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const idle = Object.keys(actions).find(n => n.toLowerCase().includes('idle'))
      const walk = Object.keys(actions).find(n => n.toLowerCase().includes('walk'))
      const first = Object.keys(actions)[0]
      
      const toPlay = idle || walk || first
      if (toPlay && actions[toPlay]) {
        actions[toPlay].reset().fadeIn(0.5).play()
        setCurrentAnim(toPlay)
      }
    }
  }, [actions])

  const prevPos = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    if (!group.current || !actions) return
    const camera = state.camera

    // Project camera forward vector onto the XZ plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    if (forward.lengthSq() > 0.001) forward.normalize()

    // Place the warrior 8 units in front of the camera (further away so he's easier to see)
    const targetPos = camera.position.clone().add(forward.clone().multiplyScalar(8))
    targetPos.y = -2.5 // lock to ground, slightly lower to center in view

    // Smoothly follow position
    group.current.position.lerp(targetPos, 15 * delta)

    // Smoothly rotate to face away from camera
    const angle = Math.atan2(forward.x, forward.z)
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, angle, 12 * delta)

    // Determine if moving by checking camera distance delta
    const dist = camera.position.distanceTo(prevPos.current)
    const isMoving = dist > 0.06 // Increased tolerance to ignore stick drift / floating point micro-movements

    if (isMoving) {
      const walk = Object.keys(actions).find(n => n.toLowerCase().includes('walk')) || Object.keys(actions)[0]
      if (walk && currentAnim !== walk && actions[walk]) {
        if (currentAnim && actions[currentAnim]) actions[currentAnim].fadeOut(0.2)
        actions[walk].reset().fadeIn(0.2).play()
        setCurrentAnim(walk)
      }
    } else {
      const idle = Object.keys(actions).find(n => n.toLowerCase().includes('idle')) || Object.keys(actions)[0]
      if (idle && currentAnim !== idle && actions[idle]) {
        if (currentAnim && actions[currentAnim]) actions[currentAnim].fadeOut(0.2)
        actions[idle].reset().fadeIn(0.2).play()
        setCurrentAnim(idle)
      }
    }

    prevPos.current.copy(camera.position)
  })

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/Untitled.glb')
