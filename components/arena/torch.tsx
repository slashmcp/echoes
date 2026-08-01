'use client'

import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

interface TorchProps {
  position: [number, number, number]
  rotation?: [number, number, number]
}

export function Torch({ position, rotation = [0, 0, 0] }: TorchProps) {
  const lightRef = useRef<THREE.PointLight>(null)
  
  // Load the beautiful new sconce model!
  const { scene } = useGLTF('/source/03.glb')
  const clone = useMemo(() => scene.clone(), [scene])
  
  // Random offset so torches don't flicker in perfect sync
  const timeOffset = useMemo(() => Math.random() * 100, [])

  useFrame((state) => {
    if (!lightRef.current) return
    const t = state.clock.elapsedTime + timeOffset
    
    // Complex noise function for realistic fire flickering
    // Multiply values to make it a bright, room-illuminating torch
    // In physically correct lighting, intensities often need to be in the hundreds
    const base = 250.0
    const lowFreq = Math.sin(t * 2) * 20.0
    const highFreq = Math.sin(t * 15) * 10.0 + Math.sin(t * 31) * 8.0
    
    // Calculate final intensity and clamp it slightly so it doesn't go dark
    const flicker = Math.max(50.0, base + lowFreq + highFreq)
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, flicker, 0.2)
    
    // Very subtle position jitter for the light source
    lightRef.current.position.y = Math.sin(t * 20) * 0.05 + 0.2
    lightRef.current.position.x = Math.cos(t * 17) * 0.05
  })

  return (
    <group position={position} rotation={rotation}>
      {/* The 3D Sconce Model */}
      <primitive 
        object={clone} 
        position={[0, -0.8, 0]} // Shifted down
        scale={[4.5, 4.5, 4.5]} // Scaled up! Sconces are usually small in GLB form.
      />
      
      {/* The glowing ember core (simulate the fire) */}
      <mesh position={[0, 0.2, 0.4]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#ff5500" />
      </mesh>
      
      {/* The flickering light source */}
      <pointLight
        ref={lightRef}
        color="#ff8822"
        distance={50}
        decay={2}
        intensity={50} // Fallback initial intensity
        position={[0, 0.2, 0.6]} // Moved further out from the wall to prevent the light from being trapped in the wall geometry
      />
    </group>
  )
}

useGLTF.preload('/source/03.glb')
