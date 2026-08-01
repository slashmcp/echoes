'use client'

import React, { useRef } from 'react'
import { useGLTF, Html } from '@react-three/drei'
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
      groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
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

      <Html position={[0, 1.5, 0]} center distanceFactor={12}>
        <div 
          onClick={(e) => {
            e.stopPropagation()
            onLoot()
          }}
          className="cursor-pointer rounded border border-amber-500/50 bg-black/80 px-3 py-1 font-serif text-sm tracking-widest text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-colors hover:bg-amber-900/80 uppercase"
        >
          Loot Shield
        </div>
      </Html>
    </group>
  )
}
