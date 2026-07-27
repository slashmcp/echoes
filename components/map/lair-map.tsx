'use client'

import { Map as MapIcon, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { soundManager } from '@/lib/audio/sound-manager'

interface LairMapProps {
  bossHealth: number
  onClose: () => void
}

type CellType = 'unexplored' | 'path' | 'wall' | 'start' | 'chest' | 'trap' | 'boss'

interface MapCell {
  x: number
  y: number
  type: CellType
  revealed: boolean
  hasItem?: 'shield' | 'lava' | 'start' | 'boss'
  itemCollected?: boolean
}

const GRID_SIZE = 7 // 7x7 grid

export function LairMap({ bossHealth, onClose }: LairMapProps) {
  const [playerPos, setPlayerPos] = useState({ x: 3, y: 6 }) // Start at bottom middle
  const [grid, setGrid] = useState<MapCell[]>([])

  // Initialize the grid on mount
  useEffect(() => {
    const newGrid: MapCell[] = []
    
    // Seed positions of interest
    const chestPositions = [
      { x: 1, y: 2, item: 'shield' as const },
      { x: 5, y: 3, item: 'shield' as const }
    ]
    const trapPositions = [
      { x: 2, y: 4, item: 'lava' as const },
      { x: 4, y: 2, item: 'lava' as const }
    ]

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let type: CellType = 'unexplored'
        let hasItem: MapCell['hasItem'] = undefined

        if (x === 3 && y === 6) {
          type = 'start'
          hasItem = 'start'
        } else if (x === 3 && y === 0) {
          type = 'boss'
          hasItem = 'boss'
        } else {
          const chest = chestPositions.find(p => p.x === x && p.y === y)
          if (chest) {
            hasItem = 'shield'
          }
          const trap = trapPositions.find(p => p.x === x && p.y === y)
          if (trap) {
            hasItem = 'lava'
          }
        }

        newGrid.push({
          x,
          y,
          type,
          revealed: x === 3 && y === 6, // Reveal start position
          hasItem
        })
      }
    }
    setGrid(newGrid)
  }, [])

  function movePlayer(dx: number, dy: number) {
    const nextX = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + dx))
    const nextY = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + dy))

    if (nextX === playerPos.x && nextY === playerPos.y) return

    setPlayerPos({ x: nextX, y: nextY })
    soundManager.playTick()

    // Reveal and check items
    setGrid(prev => prev.map(cell => {
      if (cell.x === nextX && cell.y === nextY) {
        let nextCell = { ...cell, revealed: true }
        
        if (cell.hasItem === 'shield' && !cell.itemCollected) {
          soundManager.playMessagePop() // play positive sound
          nextCell.itemCollected = true
        } else if (cell.hasItem === 'lava' && !cell.itemCollected) {
          soundManager.playDamageImpact() // play hit sound
          nextCell.itemCollected = true
        }
        return nextCell
      }
      return cell
    }))
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault()
        movePlayer(0, -1)
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault()
        movePlayer(0, 1)
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault()
        movePlayer(-1, 0)
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault()
        movePlayer(1, 0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerPos, grid])

  // Controller support
  useEffect(() => {
    let active = true
    let cooldown = false

    function pollController() {
      if (!active) return
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
      const gamepad = Array.from(gamepads).find(g => g !== null)
      
      if (gamepad && gamepad.axes && !cooldown) {
        const x = gamepad.axes[0]
        const y = gamepad.axes[1]

        if (y < -0.5) { // Up
          movePlayer(0, -1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (y > 0.5) { // Down
          movePlayer(0, 1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x < -0.5) { // Left
          movePlayer(-1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x > 0.5) { // Right
          movePlayer(1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        }
      }
      requestAnimationFrame(pollController)
    }

    pollController()
    return () => { active = false }
  }, [playerPos, grid])

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between bg-black/95 p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-primary" />
          <h2 className="font-serif text-xs font-bold tracking-[0.3em] text-primary uppercase">
            Darkness Exploration
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8 rounded-full border border-border"
        >
          <X className="size-4" />
        </Button>
      </header>

      {/* Grid Map */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
        <div className="grid grid-cols-7 gap-1 border border-border/40 p-2 bg-black/60 rounded">
          {Array.from({ length: GRID_SIZE }).map((_, y) => 
            Array.from({ length: GRID_SIZE }).map((_, x) => {
              const cell = grid.find(c => c.x === x && c.y === y)
              const isPlayer = playerPos.x === x && playerPos.y === y
              const isRevealed = cell?.revealed

              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    "size-10 rounded-sm flex items-center justify-center text-sm font-bold border transition-all duration-200",
                    !isRevealed && "bg-black border-neutral-900 text-transparent",
                    isRevealed && "bg-neutral-900 border-neutral-800 text-neutral-400",
                    isPlayer && "bg-primary border-primary text-black shadow-[0_0_10px_oklch(0.7_0.2_45)] scale-105 z-10",
                    isRevealed && cell?.hasItem === 'start' && "border-blue-500/50 text-blue-400",
                    isRevealed && cell?.hasItem === 'shield' && "border-emerald-500/50 text-emerald-400 bg-emerald-950/20",
                    isRevealed && cell?.hasItem === 'lava' && "border-red-500/50 text-red-400 bg-red-950/20",
                    isRevealed && cell?.hasItem === 'boss' && "border-amber-500/50 text-amber-400 bg-amber-950/20 animate-pulse"
                  )}
                >
                  {isPlayer ? '👾' : isRevealed ? (
                    cell?.hasItem === 'start' ? '🏁' :
                    cell?.hasItem === 'shield' ? '🛡️' :
                    cell?.hasItem === 'lava' ? '🌋' :
                    cell?.hasItem === 'boss' ? '🐲' : '·'
                  ) : ''}
                </div>
              )
            })
          )}
        </div>

        <p className="text-[10px] tracking-wider text-muted-foreground uppercase text-center max-w-xs leading-relaxed">
          Move using <kbd className="rounded bg-muted px-1 py-0.5 text-foreground">WASD</kbd> or <kbd className="rounded bg-muted px-1 py-0.5 text-foreground">D-Pad</kbd> in the dark. Find the dragon 🐲 or loot chests 🛡️, avoid traps 🌋.
        </p>
      </div>

      {/* Footer Instructions */}
      <footer className="border-t border-border pt-4 text-center">
        <p className="font-serif text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Start</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Esc</kbd> to return to the arena
        </p>
      </footer>
    </div>
  )
}
