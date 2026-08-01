'use client'

import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DragonShieldItemProps {
  position: [number, number, number]
  onLoot: () => void
}

export function DragonShieldItem({ position, onLoot }: DragonShieldItemProps) {
  const { scene } = useGLTF('/dragon_shield.glb')
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.5
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2
    }
  })

  return (
    <group position={position}>
      {/* Floating shield */}
      <primitive 
        ref={groupRef}
        object={scene.clone()} 
        scale={0.015}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e: any) => {
          e.stopPropagation()
          onLoot()
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      />
      {/* Glow / Pedestal indicator */}
      <pointLight color="#ffcc00" intensity={1.5} distance={5} position={[0, 0.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
