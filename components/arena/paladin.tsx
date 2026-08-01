import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { useGraph, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GLTF, SkeletonUtils } from 'three-stdlib'

type ActionName =
  | 'Base_Idle'
  | 'sheath sword 1'
  | 'sheath sword 2'
  | 'sword and shield 180 turn'
  | 'sword and shield 180 turn (2)'
  | 'sword and shield attack'
  | 'sword and shield attack (2)'
  | 'sword and shield attack (3)'
  | 'sword and shield attack (4)'
  | 'sword and shield block'
  | 'sword and shield block (2)'
  | 'sword and shield block idle'
  | 'sword and shield casting'
  | 'sword and shield casting (2)'
  | 'sword and shield crouch'
  | 'sword and shield crouch block'
  | 'sword and shield crouch block (2)'
  | 'sword and shield crouch block idle'
  | 'sword and shield crouch idle'
  | 'sword and shield crouching'
  | 'sword and shield crouching (2)'
  | 'sword and shield crouching (3)'
  | 'sword and shield death'
  | 'sword and shield death (2)'
  | 'sword and shield idle'
  | 'sword and shield idle (2)'
  | 'sword and shield idle (3)'
  | 'sword and shield idle (4)'
  | 'sword and shield impact'
  | 'sword and shield impact (2)'
  | 'sword and shield impact (3)'
  | 'sword and shield jump'
  | 'sword and shield jump (2)'
  | 'sword and shield kick'
  | 'sword and shield power up'
  | 'sword and shield run'
  | 'sword and shield run (2)'
  | 'sword and shield slash'
  | 'sword and shield slash (2)'
  | 'sword and shield slash (3)'
  | 'sword and shield slash (4)'
  | 'sword and shield slash (5)'
  | 'sword and shield strafe'
  | 'sword and shield strafe (2)'
  | 'sword and shield strafe (3)'
  | 'sword and shield strafe (4)'
  | 'sword and shield turn'
  | 'sword and shield turn (2)'
  | 'sword and shield walk'
  | 'sword and shield walk (2)'

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName
}

type GLTFResult = GLTF & {
  nodes: {
    Paladin_J_Nordstrom: THREE.SkinnedMesh
    Paladin_J_Nordstrom_Helmet: THREE.SkinnedMesh
    mixamorigHips: THREE.Bone
  }
  materials: {
    Paladin_MAT: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

type PaladinProps = JSX.IntrinsicElements['group'] & {
  hasDragonShield?: boolean
}

export function Paladin({ hasDragonShield, ...props }: PaladinProps) {
  const group = React.useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/paladin.glb')
  
  // Clone to allow multiple Paladins if needed
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as GLTFResult
  const { actions } = useAnimations(animations, group)
  
  // Dragon Shield logic
  const { scene: shieldSceneRaw } = useGLTF('/dragon_shield.glb')
  const shieldScene = React.useMemo(() => {
    const s = SkeletonUtils.clone(shieldSceneRaw)
    s.scale.set(0.012, 0.012, 0.012)
    s.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI / 2) // Adjust as needed
    s.position.set(-15, 5, 5) // Adjust relative to hand
    return s
  }, [shieldSceneRaw])

  useEffect(() => {
    if (hasDragonShield) {
      const leftHand = clone.getObjectByName('mixamorigLeftHand') || clone.getObjectByName('mixamorigLeftForeArm') || clone
      leftHand.add(shieldScene)
    } else {
      if (shieldScene.parent) {
        shieldScene.parent.remove(shieldScene)
      }
    }
    return () => {
      if (shieldScene.parent) {
        shieldScene.parent.remove(shieldScene)
      }
    }
  }, [hasDragonShield, clone, shieldScene])
  
  const [currentAnim, setCurrentAnim] = useState<ActionName | null>(null)

  // Initialization & Idle state
  useEffect(() => {
    if (actions && actions['sword and shield idle']) {
      actions['sword and shield idle'].reset().fadeIn(0.5).play()
      setCurrentAnim('sword and shield idle')
    }
  }, [actions])

  // Optional: Enhance the Paladin's material (add a slight metallic shine)
  useEffect(() => {
    if (materials.Paladin_MAT) {
      materials.Paladin_MAT.metalness = 0.5
      materials.Paladin_MAT.roughness = 0.4
    }
  }, [materials])

  const prevPos = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    if (!group.current || !actions) return
    const camera = state.camera

    // Player position handling (chasing the player)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    if (forward.lengthSq() > 0.001) forward.normalize()

    // Stand 5 units in front of the camera
    const targetPos = camera.position.clone().add(forward.clone().multiplyScalar(5))
    targetPos.y = -2

    // Move smoothly towards the player
    group.current.position.lerp(targetPos, 15 * delta)

    // Face the player
    const angle = Math.atan2(forward.x, forward.z)
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, angle, 12 * delta)

    // Animation state machine (Idle vs Walk) based on movement
    const dist = camera.position.distanceTo(prevPos.current)
    const isMoving = dist > 0.09

    if (isMoving) {
      if (currentAnim !== 'sword and shield walk' && actions['sword and shield walk']) {
        if (currentAnim && actions[currentAnim]) actions[currentAnim].fadeOut(0.2)
        actions['sword and shield walk'].reset().fadeIn(0.2).play()
        setCurrentAnim('sword and shield walk')
      }
    } else {
      if (currentAnim !== 'sword and shield idle' && actions['sword and shield idle']) {
        if (currentAnim && actions[currentAnim]) actions[currentAnim].fadeOut(0.2)
        actions['sword and shield idle'].reset().fadeIn(0.2).play()
        setCurrentAnim('sword and shield idle')
      }
    }

    prevPos.current.copy(camera.position)
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Scene">
        {/* Adjusted rotation and scale based on GLTF JSX output */}
        <group name="PaladinRig" rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
          <primitive object={nodes.mixamorigHips} />
          <skinnedMesh 
            name="Paladin_J_Nordstrom" 
            geometry={nodes.Paladin_J_Nordstrom.geometry} 
            material={materials.Paladin_MAT} 
            skeleton={nodes.Paladin_J_Nordstrom.skeleton} 
            castShadow
            receiveShadow
          />
          <skinnedMesh 
            name="Paladin_J_Nordstrom_Helmet" 
            geometry={nodes.Paladin_J_Nordstrom_Helmet.geometry} 
            material={materials.Paladin_MAT} 
            skeleton={nodes.Paladin_J_Nordstrom_Helmet.skeleton} 
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/paladin.glb')
