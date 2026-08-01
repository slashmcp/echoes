import { MAX_BOSS_HEALTH, MAX_PLAYER_HEALTH, OPENING_ROAR } from '@/lib/game/content'
import { createClient } from '@/lib/supabase/server'

/** Starts a fresh duel, retiring any duel still in progress. */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'You must be signed in to enter the hall.' }, { status: 401 })
  }

  await supabase
    .from('game_sessions')
    .update({ is_active: false, outcome: 'defeat' })
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { data: session, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: user.id,
      player_health: MAX_PLAYER_HEALTH,
      shield_charge: 0,
      boss_health: MAX_BOSS_HEALTH,
      boss_state: 'cocky',
      current_riddle_index: 0,
      turn_count: 0,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !session) {
    return Response.json({ error: 'The mountain would not open.' }, { status: 500 })
  }

  const opening = `${OPENING_ROAR}\n\nI devour the forest yet leave no tooth. I climb without limb and dance without feet. Water is my only god, and it is a cruel one. Name me, morsel, or become me.`

  const { data: entry } = await supabase
    .from('dialogue_logs')
    .insert({
      session_id: session.id,
      user_id: user.id,
      speaker: 'ignis',
      transcript: opening,
      boss_state: 'cocky',
    })
    .select('id, speaker, transcript, boss_state, damage_to_boss, damage_to_player, created_at')
    .single()

  return Response.json({
    session: {
      id: session.id,
      playerHealth: session.player_health,
      shieldCharge: session.shield_charge,
      bossHealth: session.boss_health,
      bossState: session.boss_state,
      currentRiddleIndex: session.current_riddle_index,
      turnCount: session.turn_count,
      outcome: session.outcome,
      isActive: session.is_active,
    },
    entries: entry
      ? [
          {
            id: entry.id,
            speaker: entry.speaker,
            transcript: entry.transcript,
            bossState: entry.boss_state,
            damageToBoss: entry.damage_to_boss,
            damageToPlayer: entry.damage_to_player,
            createdAt: entry.created_at,
          },
        ]
      : [],
  })
}
