'use client'

import { MAX_BOSS_HEALTH, STATE_META } from '@/lib/game/content'
import { cn } from '@/lib/utils'
import type { BossState } from '@/lib/game/types'

interface BossHudProps {
  bossHealth: number
  bossState: BossState
  riddleIndex: number
  lastHit: number
}

export function BossHud({ bossHealth, bossState, riddleIndex, lastHit }: BossHudProps) {
  const pct = Math.max(0, Math.min(100, (bossHealth / MAX_BOSS_HEALTH) * 100))
  const meta = STATE_META[bossState]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-ember-glow font-serif text-lg leading-none font-bold tracking-[0.22em] text-primary uppercase">
            Ignis
          </h2>
          <p className="mt-1 text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            The Ancient Flame
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              'font-serif text-xs font-bold tracking-[0.25em] uppercase transition-colors duration-500',
              meta.tone,
              bossState === 'enraged' && 'animate-pulse',
            )}
          >
            {meta.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Riddle {Math.min(riddleIndex + 1, 5)} / 5
          </span>
        </div>
      </div>

      {/* Boss health bar */}
      <div className="relative">
        <div
          role="meter"
          aria-label="Ignis health"
          aria-valuenow={bossHealth}
          aria-valuemin={0}
          aria-valuemax={MAX_BOSS_HEALTH}
          className="relative h-3 overflow-hidden border border-border bg-black/60"
        >
          {/* Damage ghost — shows the chunk just removed */}
          <div
            className="absolute inset-y-0 left-0 bg-destructive/45 transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.min(100, pct + (lastHit / MAX_BOSS_HEALTH) * 100)}%` }}
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 transition-[width] duration-500 ease-out',
              bossState === 'weakened' || bossState === 'defeated'
                ? 'bg-muted-foreground'
                : 'bg-gradient-to-r from-primary to-accent',
            )}
            style={{ width: `${pct}%` }}
          />
          <div aria-hidden className="scanline-veil absolute inset-0 opacity-40" />
        </div>

        {/* Segment ticks */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-black/60 last:border-r-0" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>{meta.description}</span>
        <span className="font-bold tabular-nums text-foreground">
          {bossHealth} / {MAX_BOSS_HEALTH}
        </span>
      </div>
    </div>
  )
}
