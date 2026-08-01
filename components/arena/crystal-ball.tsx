'use client'

import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface CrystalBallProps {
  position: [number, number, number]
  onClick: () => void
}

export function CrystalBall({ position, onClick }: CrystalBallProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 1.2, 8]} />
        <meshStandardMaterial color="#222" roughness={0.8} />
      </mesh>
      
      {/* Crystal Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.5}
          chromaticAberration={0.5}
          anisotropy={0.3}
          distortion={0.5}
          distortionScale={0.5}
          temporalDistortion={0.1}
          clearcoat={1}
          color={hovered ? "#aaffff" : "#ffffff"}
        />
        
        {/* Glow */}
        <pointLight color="#00ffff" intensity={hovered ? 2 : 0.5} distance={3} />
        
        <Html position={[0, 0.6, 0]} center className="pointer-events-none opacity-80">
          <div className={`transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="bg-black/80 text-cyan-300 text-xs tracking-widest px-2 py-1 rounded border border-cyan-800 uppercase shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              Gaze
            </span>
          </div>
        </Html>
      </mesh>
    </group>
  )
}
