'use client'

import { useEffect, useRef, useState } from 'react'

export interface GamepadState {
  connected: boolean
  buttons: boolean[]
  axes: number[]
}

export function useGamepad() {
  const [state, setState] = useState<GamepadState>({
    connected: false,
    buttons: Array(16).fill(false),
    axes: [0, 0, 0, 0],
  })

  const stateRef = useRef(state)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    function handleConnected(e: GamepadEvent) {
      console.log('Gamepad connected:', e.gamepad.id)
      pollGamepads()
    }

    function handleDisconnected(e: GamepadEvent) {
      console.log('Gamepad disconnected:', e.gamepad.id)
      const activeGamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const anyConnected = Array.from(activeGamepads).some(g => g !== null)
      if (!anyConnected) {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        setState({
          connected: false,
          buttons: Array(16).fill(false),
          axes: [0, 0, 0, 0],
        })
      }
    }

    window.addEventListener('gamepadconnected', handleConnected)
    window.addEventListener('gamepaddisconnected', handleDisconnected)

    // Check if a gamepad is already plugged in on mount
    const initialGamepads = navigator.getGamepads ? navigator.getGamepads() : []
    const anyInitial = Array.from(initialGamepads).some(g => g !== null)
    if (anyInitial) {
      pollGamepads()
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected)
      window.removeEventListener('gamepaddisconnected', handleDisconnected)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    function pollGamepads() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const primaryGamepad = Array.from(gamepads).find(g => g !== null)

      if (primaryGamepad) {
        const nextButtons = primaryGamepad.buttons.map(b => b.pressed)
        const nextAxes = [...primaryGamepad.axes]

        // Only update React state if something changed to avoid render loops
        const prev = stateRef.current
        const buttonsChanged = nextButtons.some((val, idx) => val !== prev.buttons[idx])
        const axesChanged = nextAxes.some((val, idx) => Math.abs(val - prev.axes[idx]) > 0.15)

        if (!prev.connected || buttonsChanged || axesChanged) {
          setState({
            connected: true,
            buttons: nextButtons,
            axes: nextAxes,
          })
        }
      }

      animationFrameRef.current = requestAnimationFrame(pollGamepads)
    }
  }, [])

  return state
}
