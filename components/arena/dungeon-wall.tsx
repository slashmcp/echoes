'use client'

import * as THREE from 'three'
import { useMemo, useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

interface DungeonWallProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  size?: [number, number, number] // [width, height, depth]
}

export function DungeonWall({ position, rotation = [0, 0, 0], size = [10, 16, 10] }: DungeonWallProps) {
  const { gl } = useThree()
  
  const tex = useTexture('/WALL.png')
  
  const mat = useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    // Repeat based on size so textures tile perfectly across multiple walls
    tex.repeat.set(size[0] / 10, size[1] / 10)
    tex.minFilter = THREE.LinearMipMapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.anisotropy = gl.capabilities.getMaxAnisotropy()
    tex.needsUpdate = true

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0.1,
      color: '#aaaaaa', // slight darkening of walls for mood
      emissive: '#1a1a1a', // Ensure it doesn't go pitch black in shadows
      emissiveIntensity: 0.5
    })
  }, [tex, gl, size])

  useEffect(() => {
    return () => {
      mat.dispose()
    }
  }, [mat])

  return (
    <mesh position={position} rotation={rotation} material={mat} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}
