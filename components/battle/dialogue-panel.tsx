'use client'

import { Loader2, Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { STATE_META } from '@/lib/game/content'
import { cn } from '@/lib/utils'
import type { DialogueEntry } from '@/lib/game/types'

interface DialoguePanelProps {
  entries: DialogueEntry[]
  username: string
  isThinking: boolean
  speakingEntryId: string | null
}

export function DialoguePanel({
  entries,
  username,
  isThinking,
  speakingEntryId,
}: DialoguePanelProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length, isThinking])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
      {entries.map((entry) => {
        const isIgnis = entry.speaker === 'ignis'
        const isSystem = entry.speaker === 'system'
        const meta = entry.bossState ? STATE_META[entry.bossState] : null

        if (isSystem) {
          return (
            <p
              key={entry.id}
              className="text-center font-serif text-[11px] tracking-[0.25em] text-muted-foreground uppercase"
            >
              {entry.transcript}
            </p>
          )
        }

        return (
          <article
            key={entry.id}
            className={cn('flex flex-col gap-1.5', !isIgnis && 'items-end text-right')}
          >
            <header className="flex items-center gap-2">
              <span
                className={cn(
                  'font-serif text-[10px] font-bold tracking-[0.3em] uppercase',
                  isIgnis ? meta?.tone ?? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {isIgnis ? 'Ignis' : username}
              </span>
              {isIgnis && speakingEntryId === entry.id && (
                <Volume2 aria-label="Speaking" className="size-3 animate-pulse text-primary" />
              )}
              {entry.damageToBoss > 0 && (
                <span className="text-[10px] font-bold tabular-nums text-accent">
                  −{entry.damageToBoss} to Ignis
                </span>
              )}
              {entry.damageToPlayer > 0 && (
                <span className="text-[10px] font-bold tabular-nums text-destructive">
                  −{entry.damageToPlayer} to you
                </span>
              )}
            </header>

            <p
              className={cn(
                'max-w-[92%] leading-relaxed text-pretty',
                isIgnis
                  ? 'border-l-2 border-primary/50 pl-3 font-serif text-[15px] text-foreground sm:text-base'
                  : 'text-sm text-muted-foreground',
              )}
            >
              {entry.transcript}
            </p>
          </article>
        )
      })}

      {isThinking && (
        <div className="flex items-center gap-2 border-l-2 border-primary/30 pl-3">
          <Loader2 aria-hidden className="size-3.5 animate-spin text-primary" />
          <span className="font-serif text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Ignis considers you
          </span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
