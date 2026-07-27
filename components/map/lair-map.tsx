'use client'

import { Map as MapIcon, X, User, Skull, Gem, Flame, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { soundManager } from '@/lib/audio/sound-manager'

interface LairMapProps {
  bossHealth: number
  onClose: () => void
}

type CellType = 'empty' | 'player' | 'dragon' | 'chest' | 'trap' | 'goal'

interface Tile {
  x: number;
  y: number;
  type: CellType;
  explored: boolean;
}

const GRID_SIZE = 7

export function LairMap({ bossHealth, onClose }: LairMapProps) {
  const [board, setBoard] = useState<Tile[]>([])
  const [playerPos, setPlayerPos] = useState({ x: 3, y: 6 })

  // Initialize board state representing a 7x7 dark grid
  useEffect(() => {
    const tiles: Tile[] = []
    
    // Seed locations matching the map layout template
    const dragonPos = { x: 3, y: 0 }
    const goalPos = { x: 3, y: 6 }
    const chestPositions = [
      { x: 1, y: 2 },
      { x: 5, y: 3 }
    ]
    const trapPositions = [
      { x: 2, y: 4 },
      { x: 4, y: 2 }
    ]

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let type: CellType = 'empty'

        if (x === playerPos.x && y === playerPos.y) {
          type = 'player'
        } else if (x === dragonPos.x && y === dragonPos.y) {
          type = 'dragon'
        } else if (x === goalPos.x && y === goalPos.y) {
          type = 'goal'
        } else if (chestPositions.some(p => p.x === x && p.y === y)) {
          type = 'chest'
        } else if (trapPositions.some(p => p.x === x && p.y === y)) {
          type = 'trap'
        }

        tiles.push({
          x,
          y,
          type,
          explored: x === playerPos.x && y === playerPos.y // Player's initial cell is explored
        })
      }
    }
    setBoard(tiles)
  }, [])

  function movePlayer(dx: number, dy: number) {
    const nextX = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.x + dx))
    const nextY = Math.max(0, Math.min(GRID_SIZE - 1, playerPos.y + dy))

    if (nextX === playerPos.x && nextY === playerPos.y) return

    setPlayerPos({ x: nextX, y: nextY })
    soundManager.playTick()

    // Move player and update explored status of cells
    setBoard(prev => prev.map(tile => {
      // 1. Clear player type from the old player tile
      let nextType = tile.type
      if (tile.x === playerPos.x && tile.y === playerPos.y) {
        nextType = 'empty'
        // Restore start/goal/etc tags if we moved away from them
        if (tile.x === 3 && tile.y === 6) nextType = 'goal'
      }

      // 2. Add player type to the new player tile, mark explored, trigger SFX
      if (tile.x === nextX && tile.y === nextY) {
        const wasExplored = tile.explored
        
        if (tile.type === 'chest' && !wasExplored) {
          soundManager.playMessagePop()
        } else if (tile.type === 'trap' && !wasExplored) {
          soundManager.playDamageImpact()
        } else if (tile.type === 'dragon' && !wasExplored) {
          soundManager.playDragonRoar()
        }

        return {
          ...tile,
          type: 'player',
          explored: true
        }
      }

      return {
        ...tile,
        type: nextType
      }
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
  }, [playerPos, board])

  // Controller polling
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

        if (y < -0.5) {
          movePlayer(0, -1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (y > 0.5) {
          movePlayer(0, 1)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x < -0.5) {
          movePlayer(-1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        } else if (x > 0.5) {
          movePlayer(1, 0)
          cooldown = true
          setTimeout(() => cooldown = false, 250)
        }
      }
      requestAnimationFrame(pollController)
    }

    pollController()
    return () => { active = false }
  }, [playerPos, board])

  const renderIcon = (type: CellType, explored: boolean) => {
    if (!explored) return null
    switch (type) {
      case 'player': 
        return <User className="w-8 h-8 text-[#d97736] drop-shadow-[0_0_10px_rgba(217,119,54,0.9)]" />
      case 'dragon': 
        return <Skull className="w-8 h-8 text-red-600 drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
      case 'chest': 
        return <Gem className="w-7 h-7 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
      case 'trap': 
        return <Flame className="w-7 h-7 text-orange-600 drop-shadow-[0_0_8px_rgba(234,88,12,0.7)]" />
      case 'goal': 
        return <Target className="w-8 h-8 text-gray-300 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
      default: 
        return <div className="w-2.5 h-2.5 rounded-full bg-[#3a2015] opacity-60" />
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between bg-black/95 p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* CRT Scanline Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 opacity-20" 
        style={{
          background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))',
          backgroundSize: '100% 4px, 3px 100%'
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 pb-4">
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

      {/* Grid Map filling the viewport with Isometric Angled Board */}
      <div className="flex flex-1 flex-col items-center justify-center p-2 sm:p-4">
        <div 
          className="relative flex items-center justify-center border-4 border-[#1c120c] bg-cover bg-center rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden w-full h-[72vh]"
          style={{ 
            backgroundImage: "url('/tabletop_board_angled.png')",
          }}
        >
          {/* Angled grid layout to match the isometric board perspective */}
          <div 
            className="grid grid-cols-7 gap-2 bg-black/40 p-4 rounded border border-[#d97736]/20 backdrop-blur-[1px] shadow-2xl transition-all duration-300"
            style={{
              transform: 'rotateX(20deg) rotateZ(-12deg) scale(0.9)',
              transformStyle: 'preserve-3d',
            }}
          >
            {board.map((tile, idx) => {
              const isPlayer = tile.type === 'player'
              const isExplored = tile.explored

              return (
                <div
                  key={`${tile.x}-${tile.y}-${idx}`}
                  className={cn(
                    "w-14 h-14 flex items-center justify-center transition-all duration-300 rounded border",
                    isPlayer && "bg-[#d97736]/35 border-[#d97736] shadow-[0_0_20px_rgba(217,119,54,0.8)] scale-110 z-10 [transform:translateZ(10px)]",
                    !isPlayer && isExplored && "border-[#d97736]/30 bg-black/55 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]",
                    !isExplored && "border-neutral-900 bg-neutral-950/95"
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Re-align icon upright so it doesn't lay completely flat */}
                  <div className={cn(isPlayer && "animate-bounce")} style={{ transform: 'rotateZ(12deg) rotateX(-20deg)' }}>
                    {renderIcon(tile.type, isExplored)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend / Instructions */}
        <div className="mt-4 text-center text-[#a89f91] font-mono text-xs tracking-widest leading-relaxed max-w-md">
          <p>MOVE USING <kbd className="text-white bg-neutral-850 px-1.5 py-0.5 rounded border border-neutral-700">WASD</kbd> OR <kbd className="text-white bg-neutral-850 px-1.5 py-0.5 rounded border border-neutral-700">D-PAD</kbd> IN THE DARK.</p>
          <p className="mt-2 flex items-center justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5"><Skull className="w-4 h-4 text-red-500" /> DRAGON</span>
            <span className="flex items-center gap-1.5"><Gem className="w-4 h-4 text-blue-400" /> LOOT</span>
            <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-600" /> TRAPS</span>
          </p>
        </div>
      </div>

      {/* Footer Instructions */}
      <footer className="border-t border-border/40 pt-4 text-center">
        <p className="font-serif text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Start</kbd> or <kbd className="rounded bg-muted px-1.5 py-0.5 text-foreground">Esc</kbd> to return to the arena
        </p>
      </footer>
    </div>
  )
}
