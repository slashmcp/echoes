'use client'

import { Loader2, Swords, UserPlus } from 'lucide-react'
import Link from 'next/link'

import { GuestEnterButton } from '@/components/auth/guest-enter-button'
import { Button } from '@/components/ui/button'
import type { Outcome, Profile } from '@/lib/game/types'

interface OutcomeOverlayProps {
  outcome: Outcome | null
  hasSession: boolean
  profile: Profile
  isStarting: boolean
  isAnonymous: boolean
  onStart: () => void
}

export function OutcomeOverlay({
  outcome,
  hasSession,
  profile,
  isStarting,
  isAnonymous,
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
          {isAnonymous ? 'Guest' : `${profile.victories}W · ${profile.defeats}L`}
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

        {/* Duel / restart button */}
        {hasSession || isAnonymous ? (
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
        ) : (
          /* Not authenticated at all — offer guest OR sign-up */
          <div className="flex flex-col items-center gap-3">
            <GuestEnterButton
              label="Enter as Guest"
              size="lg"
              className="gap-2 font-serif tracking-[0.2em] uppercase"
            />
            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-border" />
              <span className="font-serif text-[10px] tracking-[0.3em] text-muted-foreground/60 uppercase">
                or
              </span>
              <div className="h-px w-12 bg-border" />
            </div>
            <Button
              render={
                <Link href="/auth/sign-up">
                  <UserPlus className="size-4" />
                  Forge a name
                </Link>
              }
              size="lg"
              variant="ghost"
              className="gap-2 font-serif tracking-[0.2em] uppercase"
            />
          </div>
        )}

        {/* Nudge anonymous users to create an account after a completed duel */}
        {isAnonymous && hasSession && (
          <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Your record disappears when you close this tab.
            </p>
            <Button
              render={
                <Link href="/auth/sign-up">
                  <UserPlus className="size-3.5" />
                  Save your record
                </Link>
              }
              size="sm"
              variant="outline"
              className="gap-1.5 font-serif text-[10px] tracking-[0.2em] uppercase"
            />
          </div>
        )}
      </div>
    </div>
  )
}
