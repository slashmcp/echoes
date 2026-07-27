'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { BossState } from '@/lib/game/types'

interface IgnisDragonProps {
  state: BossState
  isSpeaking: boolean
  /** 0..1 — drives how far the silhouette slumps as he loses. */
  wear: number
}

const STATE_COLORS: Record<BossState, { scale: string; eye: string; emissive: number }> = {
  cocky: { scale: '#2a1d16', eye: '#ffb340', emissive: 0.9 },
  irritated: { scale: '#33200f', eye: '#ff7a1c', emissive: 1.6 },
  enraged: { scale: '#45180c', eye: '#ff3b12', emissive: 3.2 },
  weakened: { scale: '#1d1713', eye: '#8a6a4a', emissive: 0.3 },
  defeated: { scale: '#161311', eye: '#3a2f28', emissive: 0.08 },
}

/**
 * Ignis is built from primitives rather than a loaded model so the arena has
 * zero asset dependencies. Silhouette, posture and glow all react to state.
 */
export function IgnisDragon({ state, isSpeaking, wear }: IgnisDragonProps) {
  const group = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Mesh>(null)
  const leftWing = useRef<THREE.Group>(null)
  const rightWing = useRef<THREE.Group>(null)
  const throat = useRef<THREE.Mesh>(null)
  const eyeL = useRef<THREE.Mesh>(null)
  const eyeR = useRef<THREE.Mesh>(null)

  const palette = STATE_COLORS[state]

  const scaleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.scale),
        roughness: 0.72,
        metalness: 0.35,
      }),
    [palette.scale],
  )

  const eyeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.eye),
        emissive: new THREE.Color(palette.eye),
        emissiveIntensity: palette.emissive * 2.4,
        roughness: 0.2,
      }),
    [palette.eye, palette.emissive],
  )

  const throatMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ff5a12'),
        emissive: new THREE.Color('#ff6a1c'),
        emissiveIntensity: palette.emissive,
        roughness: 0.4,
      }),
    [palette.emissive],
  )

  useFrame((frameState) => {
    const t = frameState.clock.elapsedTime
    const collapsed = state === 'defeated'
    const agitation = state === 'enraged' ? 3.4 : state === 'irritated' ? 1.9 : 1

    if (group.current) {
      // Breathing rise and fall, faster and shallower the angrier he gets.
      const breathe = Math.sin(t * (0.55 * agitation)) * (collapsed ? 0.02 : 0.09)
      group.current.position.y = breathe - wear * 0.85 - (collapsed ? 1.1 : 0)
      group.current.rotation.z = collapsed ? 0.34 : Math.sin(t * 0.3) * 0.02 + wear * 0.1
      group.current.rotation.y = Math.sin(t * 0.22) * 0.09
    }

    if (head.current) {
      // Tracks the player, then jerks when enraged.
      head.current.rotation.x =
        (collapsed ? 0.6 : -0.06) + Math.sin(t * 0.7 * agitation) * 0.05 + wear * 0.35
      head.current.rotation.y = Math.sin(t * 0.45) * 0.16 * (state === 'enraged' ? 2 : 1)
    }

    if (jaw.current) {
      // Jaw articulates only while the voice is playing.
      const openness = isSpeaking ? 0.16 + Math.abs(Math.sin(t * 11)) * 0.3 : 0.02
      jaw.current.rotation.x = openness
    }

    if (throat.current) {
      const heat = isSpeaking ? 1.6 : 1
      const flicker = 0.82 + Math.sin(t * 7.3) * 0.12 + Math.sin(t * 17.1) * 0.06
      throat.current.scale.setScalar(flicker * heat * (collapsed ? 0.3 : 1))
    }

    for (const eye of [eyeL.current, eyeR.current]) {
      if (!eye) continue
      const mat = eye.material as THREE.MeshStandardMaterial
      // Slow blink; rage makes the glow throb.
      const throb = state === 'enraged' ? 1 + Math.sin(t * 9) * 0.4 : 1 + Math.sin(t * 2.2) * 0.12
      mat.emissiveIntensity = palette.emissive * 2.4 * throb
    }

    const flap = collapsed ? 0 : Math.sin(t * 0.8 * agitation) * (0.1 + wear * 0.05)
    if (leftWing.current) {
      leftWing.current.rotation.z = 0.55 + flap + (collapsed ? 0.9 : 0)
    }
    if (rightWing.current) {
      rightWing.current.rotation.z = -0.55 - flap - (collapsed ? 0.9 : 0)
    }
  })

  return (
    <group ref={group} position={[0, 0, 0]} scale={1.1}>
      {/* Chest / torso */}
      <mesh material={scaleMaterial} position={[0, 0.1, 0]}>
        <sphereGeometry args={[1.5, 40, 28]} />
      </mesh>
      <mesh material={scaleMaterial} position={[0, -0.5, 0.5]} scale={[1.15, 0.8, 1]}>
        <sphereGeometry args={[1.25, 32, 22]} />
      </mesh>

      {/* Molten throat glow, visible through the ribs */}
      <mesh ref={throat} material={throatMaterial} position={[0, 0.35, 0.95]}>
        <sphereGeometry args={[0.52, 24, 18]} />
      </mesh>
      <pointLight
        position={[0, 0.4, 1.3]}
        color={palette.eye}
        intensity={palette.emissive * 9}
        distance={11}
      />

      {/* Neck */}
      <mesh material={scaleMaterial} position={[0, 1.35, 0.35]} rotation={[0.32, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.78, 1.7, 20]} />
      </mesh>

      {/* Head assembly */}
      <group ref={head} position={[0, 2.15, 0.85]}>
        <mesh material={scaleMaterial} scale={[1, 0.85, 1.5]}>
          <sphereGeometry args={[0.72, 32, 24]} />
        </mesh>

        {/* Snout */}
        <mesh material={scaleMaterial} position={[0, -0.09, 0.95]} scale={[0.62, 0.5, 1]}>
          <sphereGeometry args={[0.6, 24, 18]} />
        </mesh>

        {/* Lower jaw — animates while speaking */}
        <mesh ref={jaw} material={scaleMaterial} position={[0, -0.3, 0.62]} scale={[0.55, 0.2, 0.9]}>
          <sphereGeometry args={[0.62, 20, 14]} />
        </mesh>

        {/* Eyes */}
        <mesh ref={eyeL} material={eyeMaterial} position={[-0.34, 0.14, 0.66]}>
          <sphereGeometry args={[0.115, 16, 12]} />
        </mesh>
        <mesh ref={eyeR} material={eyeMaterial} position={[0.34, 0.14, 0.66]}>
          <sphereGeometry args={[0.115, 16, 12]} />
        </mesh>

        {/* Brow horns */}
        {[-1, 1].map((side) => (
          <mesh
            key={`horn-${side}`}
            material={scaleMaterial}
            position={[side * 0.42, 0.6, -0.16]}
            rotation={[-0.7, 0, side * 0.45]}
          >
            <coneGeometry args={[0.12, 1.25, 10]} />
          </mesh>
        ))}

        {/* Crown spines */}
        {[-0.62, -0.24, 0.24, 0.62].map((x, i) => (
          <mesh
            key={`crown-${x}`}
            material={scaleMaterial}
            position={[x, 0.34, -0.6]}
            rotation={[-1.1, 0, x * 0.7]}
          >
            <coneGeometry args={[0.075, 0.5 + (i === 1 || i === 2 ? 0.28 : 0), 8]} />
          </mesh>
        ))}
      </group>

      {/* Wings */}
      {(
        [
          ['left', leftWing, -1],
          ['right', rightWing, 1],
        ] as const
      ).map(([key, ref, side]) => (
        <group key={key} ref={ref} position={[side * 1.3, 0.6, -0.5]}>
          <mesh material={scaleMaterial} position={[side * 1.5, 0.4, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[3, 0.14, 0.14]} />
          </mesh>
          <mesh position={[side * 1.6, -0.35, -0.1]} rotation={[0, side * -0.25, 0]}>
            <planeGeometry args={[3.1, 2.1]} />
            <meshStandardMaterial
              color="#241611"
              emissive={new THREE.Color(palette.eye)}
              emissiveIntensity={palette.emissive * 0.14}
              side={THREE.DoubleSide}
              transparent
              opacity={0.88}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Dorsal spines down the back */}
      {[0.9, 0.35, -0.2, -0.75, -1.25].map((y, i) => (
        <mesh
          key={`spine-${y}`}
          material={scaleMaterial}
          position={[0, y, -1.15 + i * 0.07]}
          rotation={[-1.35, 0, 0]}
        >
          <coneGeometry args={[0.13, 0.75 - i * 0.09, 8]} />
        </mesh>
      ))}

      {/* Forelimbs braced on the stone */}
      {[-1, 1].map((side) => (
        <mesh
          key={`limb-${side}`}
          material={scaleMaterial}
          position={[side * 1.0, -1.35, 0.85]}
          rotation={[0.3, 0, side * 0.2]}
        >
          <capsuleGeometry args={[0.28, 1.0, 6, 14]} />
        </mesh>
      ))}
    </group>
  )
}
