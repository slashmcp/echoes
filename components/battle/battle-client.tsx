'use client'

import { Map as MapIcon, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ArenaViewport } from '@/components/arena/arena-viewport'
import { AnswerInput } from '@/components/battle/answer-input'
import { BossHud } from '@/components/battle/boss-hud'
import { DialoguePanel } from '@/components/battle/dialogue-panel'
import { OutcomeOverlay } from '@/components/battle/outcome-overlay'
import { PlayerHud } from '@/components/battle/player-hud'
import { Button } from '@/components/ui/button'
import { LairMap } from '@/components/map/lair-map'
import { useBossVoice } from '@/hooks/use-boss-voice'
import { useBattleController } from '@/hooks/use-battle-controller'
import type { DialogueEntry, GameSession, Profile } from '@/lib/game/types'

interface BattleClientProps {
  profile: Profile
  initialSession: GameSession | null
  initialEntries: DialogueEntry[]
  isAnonymous: boolean
  hasUser: boolean
}

export function BattleClient({ profile, initialSession, initialEntries, isAnonymous, hasUser }: BattleClientProps) {
  const [session, setSession] = useState<GameSession | null>(initialSession)
  const [entries, setEntries] = useState<DialogueEntry[]>(initialEntries)
  const [isThinking, setIsThinking] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [shake, setShake] = useState(false)
  const [lastHit, setLastHit] = useState(0)
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  const voice = useBossVoice(voiceEnabled)
  const spokenIds = useRef<Set<string>>(new Set())

  const bossState = session?.bossState ?? 'cocky'
  const isOver = Boolean(session?.outcome) || session === null

  // Speak each new Ignis line exactly once.
  useEffect(() => {
    if (!voiceEnabled) return
    const latest = [...entries].reverse().find((e) => e.speaker === 'ignis')
    if (!latest || spokenIds.current.has(latest.id)) return
    spokenIds.current.add(latest.id)
    setSpeakingEntryId(latest.id)
    void voice.speak(latest.transcript, latest.bossState ?? 'cocky')
  }, [entries, voice, voiceEnabled])

  useEffect(() => {
    if (voice.status === 'idle') setSpeakingEntryId(null)
  }, [voice.status])

  const triggerShake = useCallback(() => {
    setShake(true)
    window.setTimeout(() => setShake(false), 450)
  }, [])

  const startDuel = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    voice.stop()
    spokenIds.current.clear()

    try {
      const response = await fetch('/api/session', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'The mountain would not open.')
      setSession(data.session)
      setEntries(data.entries)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    } finally {
      setIsStarting(false)
    }
  }, [voice])

  const sendAnswer = useCallback(
    async (message: string) => {
      if (!session || isThinking) return

      const optimistic: DialogueEntry = {
        id: `local-${Date.now()}`,
        speaker: 'player',
        transcript: message,
        bossState: null,
        damageToBoss: 0,
        damageToPlayer: 0,
        createdAt: new Date().toISOString(),
      }

      setEntries((prev) => [...prev, optimistic])
      setIsThinking(true)
      setError(null)

      try {
        const response = await fetch('/api/battle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, message }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'The dragon did not answer.')

        setLastHit(data.judgement.damageToBoss)
        if (data.judgement.damageToBoss > 0 || data.judgement.damageToPlayer > 0) {
          triggerShake()
        }

        setSession(data.session)
        setEntries((prev) => [
          ...prev.filter((entry) => entry.id !== optimistic.id),
          ...data.entries,
        ])

        if (data.absorbedByShield > 0) {
          setEntries((prev) => [
            ...prev,
            {
              id: `shield-${Date.now()}`,
              speaker: 'system',
              transcript: `Your Crystal Shield shatters, absorbing ${data.absorbedByShield} damage`,
              bossState: null,
              damageToBoss: 0,
              damageToPlayer: 0,
              createdAt: new Date().toISOString(),
            },
          ])
        }
      } catch (caught) {
        setEntries((prev) => prev.filter((entry) => entry.id !== optimistic.id))
        setError(caught instanceof Error ? caught.message : 'Something went wrong.')
      } finally {
        setIsThinking(false)
      }
    },
    [isThinking, session, triggerShake],
  )

  const sendStrike = useCallback(async () => {
    if (!session || isThinking) return

    const optimistic: DialogueEntry = {
      id: `local-${Date.now()}`,
      speaker: 'player',
      transcript: '⚔️ STRIKE!',
      bossState: null,
      damageToBoss: 0,
      damageToPlayer: 0,
      createdAt: new Date().toISOString(),
    }

    setEntries((prev) => [...prev, optimistic])
    setIsThinking(true)
    setError(null)

    try {
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, action: 'strike' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Strike did not land.')

      setLastHit(data.judgement.damageToBoss)
      if (data.judgement.damageToBoss > 0 || data.judgement.damageToPlayer > 0) {
        triggerShake()
      }

      setSession(data.session)
      setEntries((prev) => [
        ...prev.filter((entry) => entry.id !== optimistic.id),
        ...data.entries,
      ])

      if (data.absorbedByShield > 0) {
        setEntries((prev) => [
          ...prev,
          {
            id: `shield-${Date.now()}`,
            speaker: 'system',
            transcript: `Your Crystal Shield shatters, absorbing ${data.absorbedByShield} damage`,
            bossState: null,
            damageToBoss: 0,
            damageToPlayer: 0,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (caught) {
      setEntries((prev) => prev.filter((entry) => entry.id !== optimistic.id))
      setError(caught instanceof Error ? caught.message : 'Strike failed.')
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, session, triggerShake])

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) voice.stop()
      return !prev
    })
  }, [voice])

  const toggleMap = useCallback(() => {
    setShowMap(prev => !prev)
  }, [])

  // Keyboard navigation/shortcuts: 'M' toggles map, 'Esc' closes map
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'm') {
        // Toggle map only if not typing in input
        const activeEl = document.activeElement?.tagName.toLowerCase()
        if (activeEl !== 'textarea' && activeEl !== 'input') {
          e.preventDefault()
          toggleMap()
        }
      } else if (e.key === 'Escape') {
        setShowMap(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleMap])

  // Controller hook setup
  const controller = useBattleController({
    onSubmit: () => {
      // Find the form submit action
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click()
      }
    },
    onClear: () => {
      const txt = document.getElementById('answer') as HTMLTextAreaElement
      if (txt) {
        txt.value = ''
        // Dispatch synthetic change event to update React input state
        const e = new Event('input', { bubbles: true })
        txt.dispatchEvent(e)
      }
    },
    onStrike: sendStrike,
    onReplay: () => {
      const latest = [...entries].reverse().find((e) => e.speaker === 'ignis')
      if (latest) {
        void voice.speak(latest.transcript, latest.bossState ?? 'cocky')
      }
    },
    onToggleMap: toggleMap,
    onToggleVoice: toggleVoice,
  }, !isOver)

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background lg:flex-row">
      {/* Arena */}
      <section
        aria-label="The arena"
        className="relative flex min-h-0 flex-1 flex-col lg:w-3/5"
      >
        <ArenaViewport
          state={bossState}
          isSpeaking={voice.isSpeaking}
          bossHealth={session?.bossHealth ?? 500}
          shake={shake}
          className="absolute inset-0 h-full w-full"
        />

        {/* Boss HUD floats over the arena */}
        <div className="pointer-events-none relative z-10 p-4 sm:p-6">
          <div className="panel-etched pointer-events-auto max-w-xl border border-border p-3 sm:p-4">
            <BossHud
              bossHealth={session?.bossHealth ?? 500}
              bossState={bossState}
              riddleIndex={session?.currentRiddleIndex ?? 0}
              lastHit={lastHit}
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Player HUD anchored to the arena floor */}
        <div className="relative z-10 p-4 sm:p-6">
          <div className="panel-etched max-w-md border border-border p-3 sm:p-4">
            <PlayerHud
              username={profile.username}
              playerHealth={session?.playerHealth ?? 100}
              shieldCharge={session?.shieldCharge ?? 0}
              turnCount={session?.turnCount ?? 0}
            />
          </div>
        </div>

        {(isOver || !session) && (
          <OutcomeOverlay
            outcome={session?.outcome ?? null}
            hasSession={Boolean(session)}
            profile={profile}
            isStarting={isStarting}
            isAnonymous={isAnonymous || !hasUser}
            onStart={startDuel}
          />
        )}

        {/* Lair Map Overlay */}
        {showMap && (
          <LairMap
            bossHealth={session?.bossHealth ?? 500}
            onClose={() => setShowMap(false)}
          />
        )}
      </section>

      {/* Dialogue column */}
      <section
        aria-label="Duel transcript"
        className="flex min-h-0 flex-1 flex-col border-t border-border bg-card/45 lg:w-2/5 lg:flex-none lg:border-t-0 lg:border-l"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <h1 className="font-serif text-[11px] font-bold tracking-[0.34em] text-primary uppercase">
              Echoes of the Scale
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {profile.victories}W · {profile.defeats}L
              </p>
              {controller.gamepadConnected && (
                <span className="text-[9px] font-bold tracking-widest text-emerald-500 uppercase bg-emerald-500/10 px-1 rounded">
                  🎮 Controller connected
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleMap}
              className="gap-1.5 text-[10px] tracking-widest uppercase border border-border/30"
            >
              <MapIcon className="size-3.5" />
              Map (M)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              aria-pressed={voiceEnabled}
              className="gap-1.5 text-[10px] tracking-widest uppercase"
            >
              {voiceEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              {voice.isUnavailable ? 'No voice key' : voiceEnabled ? 'Voice on' : 'Voice off'}
            </Button>
          </div>
        </header>

        <DialoguePanel
          entries={entries}
          username={profile.username}
          isThinking={isThinking}
          speakingEntryId={speakingEntryId}
          onReplay={voice.speak}
        />

        {error && (
          <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs leading-relaxed text-destructive">
            {error}
          </p>
        )}

        <AnswerInput
          onSubmit={sendAnswer}
          disabled={isThinking || isOver}
          onStrike={sendStrike}
        />
      </section>
    </div>
  )
}
