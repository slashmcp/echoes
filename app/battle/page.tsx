import { redirect } from 'next/navigation'

import { BattleClient } from '@/components/battle/battle-client'
import { createClient } from '@/lib/supabase/server'
import type { DialogueEntry, GameSession, Outcome } from '@/lib/game/types'

export default async function BattlePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, username, victories, defeats')
    .eq('id', user.id)
    .single()

  const profile = profileRow ?? {
    id: user.id,
    username: user.email?.split('@')[0] ?? 'Challenger',
    victories: 0,
    defeats: 0,
  }

  // Resume a duel still in progress, if there is one.
  const { data: sessionRow } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let session: GameSession | null = null
  let entries: DialogueEntry[] = []

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

  return (
    <main>
      <BattleClient profile={profile} initialSession={session} initialEntries={entries} />
    </main>
  )
}
