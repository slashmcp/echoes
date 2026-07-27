'use client'

import { Shield, ShieldOff } from 'lucide-react'

import { MAX_PLAYER_HEALTH, MAX_SHIELD_CHARGE } from '@/lib/game/content'
import { cn } from '@/lib/utils'

interface PlayerHudProps {
  username: string
  playerHealth: number
  shieldCharge: number
  turnCount: number
}

export function PlayerHud({ username, playerHealth, shieldCharge, turnCount }: PlayerHudProps) {
  const pct = Math.max(0, Math.min(100, (playerHealth / MAX_PLAYER_HEALTH) * 100))
  const critical = playerHealth <= 25

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="font-serif text-sm leading-none font-bold tracking-[0.2em] uppercase">
            {username}
          </h2>
          <p className="mt-1 text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            Challenger · Turn {turnCount}
          </p>
        </div>

        {/* Crystal Shield charges */}
        <div className="flex items-center gap-1.5" title="Crystal Shield charges">
          <span className="sr-only">
            {shieldCharge} of {MAX_SHIELD_CHARGE} Crystal Shield charges remaining
          </span>
          {Array.from({ length: MAX_SHIELD_CHARGE }).map((_, i) =>
            i < shieldCharge ? (
              <Shield
                key={i}
                aria-hidden
                className="size-4 text-accent drop-shadow-[0_0_6px_oklch(0.8_0.14_80/60%)]"
                strokeWidth={2.5}
              />
            ) : (
              <ShieldOff key={i} aria-hidden className="size-4 text-muted-foreground/35" />
            ),
          )}
        </div>
      </div>

      <div
        role="meter"
        aria-label="Your health"
        aria-valuenow={playerHealth}
        aria-valuemin={0}
        aria-valuemax={MAX_PLAYER_HEALTH}
        className="relative h-2.5 overflow-hidden border border-border bg-black/60"
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-[width] duration-500 ease-out',
            critical ? 'bg-destructive' : 'bg-foreground/85',
            critical && 'animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
        <div aria-hidden className="scanline-veil absolute inset-0 opacity-40" />
      </div>

      <div className="flex items-center justify-between text-[10px] tracking-widest uppercase">
        <span className={cn('text-muted-foreground', critical && 'text-destructive')}>
          {critical ? 'Your lungs are filling with ash' : 'Holding'}
        </span>
        <span className="font-bold tabular-nums text-foreground">
          {playerHealth} / {MAX_PLAYER_HEALTH}
        </span>
      </div>
    </div>
  )
}
