import { BattleClient } from '@/components/battle/battle-client'
import { createClient } from '@/lib/supabase/server'
import type { DialogueEntry, GameSession, Outcome } from '@/lib/game/types'

export default async function BattlePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guests land here via anonymous auth — let them through.
  // The OutcomeOverlay handles the unauthenticated state.
  const isAnonymous = user?.is_anonymous ?? false

  const { data: profileRow } = user
    ? await supabase
        .from('profiles')
        .select('id, username, victories, defeats')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const profile = profileRow ?? {
    id: user?.id ?? 'guest',
    username: isAnonymous ? 'Guest' : user?.email?.split('@')[0] ?? 'Challenger',
    victories: 0,
    defeats: 0,
  }

  // Resume a duel still in progress, if there is one.
  let session: GameSession | null = null
  let entries: DialogueEntry[] = []

  if (user) {
    const { data: sessionRow } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionRow) {
      session = {
        id: sessionRow.id,
        playerHealth: sessionRow.player_health,
        shieldCharge: sessionRow.shield_charge,
        bossHealth: sessionRow.boss_health,
        bossState: sessionRow.boss_state,
        currentRiddleIndex: sessionRow.current_riddle_index,
        turnCount: sessionRow.turn_count,
        outcome: sessionRow.outcome as Outcome | null,
        isActive: sessionRow.is_active,
      }

      const { data: logRows } = await supabase
        .from('dialogue_logs')
        .select('id, speaker, transcript, boss_state, damage_to_boss, damage_to_player, created_at')
        .eq('session_id', sessionRow.id)
        .order('created_at', { ascending: true })

      entries = (logRows ?? []).map((row) => ({
        id: row.id,
        speaker: row.speaker,
        transcript: row.transcript,
        bossState: row.boss_state,
        damageToBoss: row.damage_to_boss,
        damageToPlayer: row.damage_to_player,
        createdAt: row.created_at,
      }))
    }
  }

  return (
    <main>
      <BattleClient
        profile={profile}
        initialSession={session}
        initialEntries={entries}
        isAnonymous={isAnonymous}
        hasUser={Boolean(user)}
      />
    </main>
  )
}
