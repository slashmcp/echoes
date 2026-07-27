'use client'

import { useEffect, useRef } from 'react'
import { useGamepad } from './use-gamepad'

interface BattleControllerActions {
  onSubmit: () => void
  onClear: () => void
  onStrike: () => void
  onReplay: () => void
  onToggleMap: () => void
  onToggleVoice: () => void
}

export function useBattleController(
  actions: BattleControllerActions,
  active: boolean = true
) {
  const gamepad = useGamepad()
  const lastPressedRef = useRef<boolean[]>(Array(16).fill(false))

  // Debouncing locks to avoid duplicate triggering
  const cooldownRef = useRef<Record<number, number>>({})

  useEffect(() => {
    if (!gamepad.connected || !active) return

    const now = Date.now()
    const actionsMap: Record<number, () => void> = {
      0: actions.onSubmit,       // A
      1: actions.onClear,        // B
      4: actions.onReplay,       // LB
      7: actions.onStrike,       // RT
      9: actions.onToggleMap,    // Start
      10: actions.onToggleVoice, // LStick click
    }

    gamepad.buttons.forEach((pressed, btnIdx) => {
      const wasPressed = lastPressedRef.current[btnIdx]

      if (pressed && !wasPressed) {
        const lastTriggered = cooldownRef.current[btnIdx] ?? 0
        if (now - lastTriggered > 300) { // 300ms debounce
          const action = actionsMap[btnIdx]
          if (action) {
            action()
            cooldownRef.current[btnIdx] = now
          }
        }
      }
    })

    lastPressedRef.current = [...gamepad.buttons]
  }, [gamepad, actions, active])

  return {
    gamepadConnected: gamepad.connected,
  }
}
