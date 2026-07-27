'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { STATE_META } from '@/lib/game/content'
import type { BossState } from '@/lib/game/types'
import { IgnisDragon } from './ignis-dragon'

interface ArenaSceneProps {
  state: BossState
  isSpeaking: boolean
  wear: number
}

const EMBER_COUNT = 350

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
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ff8a2b"
        size={0.075}
        sizeAttenuation
        transparent
        opacity={Math.min(0.35 + intensity * 0.3, 0.95)}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/** The lava fissure beneath the dragon, pulsing with his temper. */
function LavaFloor({ intensity }: { intensity: number }) {
  const light = useRef<THREE.PointLight>(null)

  useFrame((frameState) => {
    if (!light.current) return
    const t = frameState.clock.elapsedTime
    light.current.intensity =
      (12 + intensity * 26) * (0.85 + Math.sin(t * 2.1) * 0.1 + Math.sin(t * 5.7) * 0.05)
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#100c0a" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Molten cracks radiating outward */}
      {[
        [0, -2.58, 2.4, 9, 0.42],
        [-3.2, -2.57, -0.6, 6, 0.24],
        [3.6, -2.57, -1.4, 7, 0.2],
      ].map(([x, y, z, len, w], i) => (
        <mesh
          key={`crack-${i}`}
          rotation={[-Math.PI / 2, 0, i * 0.7]}
          position={[x, y, z]}
        >
          <planeGeometry args={[w, len]} />
          <meshStandardMaterial
            color="#ff5512"
            emissive="#ff6a1c"
            emissiveIntensity={1.2 + intensity}
            toneMapped={false}
          />
        </mesh>
      ))}

      <pointLight ref={light} position={[0, -1.9, 1.5]} color="#ff5a14" distance={30} />
    </group>
  )
}

/** Obsidian pillars framing the hall. */
function Pillars() {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#14100e'),
        roughness: 0.88,
        metalness: 0.2,
      }),
    [],
  )

  return (
    <group>
      {[-7.5, -5.2, 5.2, 7.5].map((x, i) => (
        <mesh
          key={`pillar-${x}`}
          material={material}
          position={[x, 2 - i * 0.2, -4.5 - Math.abs(x) * 0.2]}
        >
          <cylinderGeometry args={[0.65, 0.9, 14, 7]} />
        </mesh>
      ))}
      {/* Back wall */}
      <mesh material={material} position={[0, 3, -11]}>
        <planeGeometry args={[46, 26]} />
      </mesh>
    </group>
  )
}

export function ArenaScene({ state, isSpeaking, wear }: ArenaSceneProps) {
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

      <Pillars />
      <LavaFloor intensity={intensity} />
      <Embers intensity={intensity} />
      <IgnisDragon state={state} isSpeaking={isSpeaking} wear={wear} />
    </>
  )
}
