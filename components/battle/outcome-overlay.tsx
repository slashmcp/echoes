'use client'

import { Loader2, Swords } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Outcome, Profile } from '@/lib/game/types'

interface OutcomeOverlayProps {
  outcome: Outcome | null
  hasSession: boolean
  profile: Profile
  isStarting: boolean
  onStart: () => void
}

export function OutcomeOverlay({
  outcome,
  hasSession,
  profile,
  isStarting,
  onStart,
}: OutcomeOverlayProps) {
  const title = !hasSession
    ? 'The Mountain Waits'
    : outcome === 'victory'
      ? 'The Ancient Flame Is Out'
      : 'You Are Ash'

  const body = !hasSession
    ? 'Five riddles stand between you and the hoard. Ignis reasons, remembers, and adapts — every word you choose changes what he becomes.'
    : outcome === 'victory'
      ? 'Nine hundred years of arrogance ended on the strength of your answer. The hoard is yours, and the hall is finally quiet.'
      : 'The heat took you mid-sentence. Ignis did not even shift his weight. He is already bored of your remains.'

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/85 px-6 backdrop-blur-md">
      <div className="panel-etched flex max-w-md flex-col items-center gap-5 border border-border p-8 text-center">
        <p className="font-serif text-[10px] tracking-[0.42em] text-muted-foreground uppercase">
          {profile.victories}W · {profile.defeats}L
        </p>

        <h2
          className={
            outcome === 'defeat'
              ? 'font-serif text-3xl font-bold tracking-wide text-destructive text-balance'
              : 'text-ember-glow font-serif text-3xl font-bold tracking-wide text-primary text-balance'
          }
        >
          {title}
        </h2>

        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>

        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={isStarting}
          className="gap-2 font-serif tracking-[0.2em] uppercase"
        >
          {isStarting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Swords className="size-4" />
          )}
          {isStarting ? 'Climbing' : hasSession ? 'Duel again' : 'Enter the hall'}
        </Button>
      </div>
    </div>
  )
}
