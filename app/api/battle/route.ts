import { google } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'

import { IGNIS_SYSTEM_PROMPT, MAX_BOSS_HEALTH } from '@/lib/game/content'
import { resolveTurn, resolveStrike } from '@/lib/game/engine'
import { createClient } from '@/lib/supabase/server'
import type { BossJudgement } from '@/lib/game/types'

const MODEL = google('gemini-3.5-flash')

const judgementSchema = z.object({
  verdict: z
    .enum(['correct', 'partial', 'wrong', 'evasive', 'insulting'])
    .describe("How the mortal's reply measures against the riddle."),
  reasoning: z.string().describe('One terse private sentence justifying the verdict.'),
  speech: z
    .string()
    .describe(
      "Ignis's spoken reply. Max 3 sentences, max 55 words. No stage directions, no emoji.",
    ),
  nextState: z.enum(['cocky', 'irritated', 'enraged', 'weakened', 'defeated']),
  damageToBoss: z.number().int(),
  damageToPlayer: z.number().int(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'You must be signed in to enter the hall.' }, { status: 401 })
  }

  let body: { sessionId?: string; message?: string; action?: 'answer' | 'strike' }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const sessionId = body.sessionId
  const action = body.action ?? 'answer'
  const message = action === 'strike' ? '⚔️ STRIKE!' : (body.message ?? '').trim().slice(0, 600)

  if (!sessionId || (!message && action === 'answer')) {
    return Response.json({ error: 'A session and an answer are required.' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    return Response.json({ error: 'That duel could not be found.' }, { status: 404 })
  }

  if (!session.is_active) {
    return Response.json({ error: 'This duel has already ended.' }, { status: 409 })
  }

  const nowIso = new Date().toISOString()
  let resolved: ReturnType<typeof resolveTurn> | {
    judgement: BossJudgement
    bossHealth: number
    playerHealth: number
    shieldCharge: number
    riddleIndex: number
    absorbedByShield: number
    outcome: 'victory' | 'defeat' | null
  }

  if (action === 'strike') {
    const strikeRes = resolveStrike({
      bossHealth: session.boss_health,
      playerHealth: session.player_health,
      shieldCharge: session.shield_charge,
      bossState: session.boss_state,
    })

    resolved = {
      judgement: {
        verdict: 'wrong',
        reasoning: 'Mortal struck physically.',
        speech: strikeRes.ignisLine,
        nextState: strikeRes.nextState,
        damageToBoss: strikeRes.damageToBoss,
        damageToPlayer: strikeRes.damageToPlayer,
        advanceRiddle: false,
      },
      bossHealth: strikeRes.bossHealth,
      playerHealth: strikeRes.playerHealth,
      shieldCharge: strikeRes.shieldCharge,
      riddleIndex: session.current_riddle_index,
      absorbedByShield: strikeRes.absorbedByShield,
      outcome: strikeRes.outcome,
    }
  } else {
    const { data: history } = await supabase
      .from('dialogue_logs')
      .select('speaker, transcript')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(24)

    const failedAttempts = (history ?? []).filter((h) => h.speaker === 'player').length
    const shouldHint = failedAttempts > 0 && failedAttempts % 3 === 0

    const bossPct = Math.round((session.boss_health / MAX_BOSS_HEALTH) * 100)

    const transcript = (history ?? [])
      .map((h) => `${h.speaker === 'player' ? 'MORTAL' : 'YOU'}: ${h.transcript}`)
      .join('\n')

    const context = [
      `## YOUR CONDITION`,
      `Health: ${session.boss_health} of ${MAX_BOSS_HEALTH} (${bossPct}%)`,
      `Current state: ${session.boss_state}`,
      `The mortal's health: ${session.player_health} of 100`,
      `Turn: ${session.turn_count + 1}`,
      ``,
      `## THE RIDDLE CURRENTLY ON THE TABLE (${session.current_riddle_index + 1} of 5)`,
      session.current_riddle_index >= 5
        ? 'All five riddles are spent. Judge this reply on wit alone.'
        : `You are on riddle ${session.current_riddle_index + 1}. Check the transcript below to see the riddle you most recently posed.`,
      shouldHint && session.current_riddle_index < 5
        ? `\nThe mortal has floundered repeatedly. Grudgingly weave a subtle hint about the answer into your reply.`
        : '',
      session.current_riddle_index < 4
        ? `\n## IF the verdict is "correct", pose a brand new, highly original riddle inside your same reply, in your own voice.`
        : `\n## This was the FINAL riddle. If the verdict is "correct", the mortal has broken you — set nextState to "defeated" and speak your death soliloquy.`,
      ``,
      `## THE DUEL SO FAR (Read this to remember your current riddle and the mortal's previous answers)`,
      transcript || '(The mortal has not yet spoken.)',
      ``,
      `## THE MORTAL NOW SAYS`,
      message,
    ]
      .filter(Boolean)
      .join('\n')

    let raw: BossJudgement
    try {
      const response = await fetch('http://127.0.0.1:8000/api/oracle/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: IGNIS_SYSTEM_PROMPT + '\n\n' + context,
          message: message,
        }),
      })

      if (!response.ok) {
        throw new Error(`Python API returned ${response.status}: ${await response.text()}`)
      }

      const output = await response.json()
      raw = { ...output, advanceRiddle: output.verdict === 'correct' }
    } catch (error) {
      console.log('[v0] Ignis Python brain failed:', error instanceof Error ? error.message : error)
      return Response.json(
        { error: 'The dragon fell silent — something disturbed the connection. Try again.' },
        { status: 502 },
      )
    }

    resolved = resolveTurn(raw, {
      bossHealth: session.boss_health,
      playerHealth: session.player_health,
      shieldCharge: session.shield_charge,
      riddleIndex: session.current_riddle_index,
    })
  }

  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({
      boss_health: resolved.bossHealth,
      player_health: resolved.playerHealth,
      shield_charge: resolved.shieldCharge,
      boss_state: resolved.judgement.nextState,
      current_riddle_index: resolved.riddleIndex,
      turn_count: session.turn_count + 1,
      outcome: resolved.outcome,
      is_active: resolved.outcome === null,
      updated_at: nowIso,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (updateError) {
    return Response.json({ error: 'The hall would not record that blow.' }, { status: 500 })
  }

  const { data: inserted } = await supabase
    .from('dialogue_logs')
    .insert([
      {
        session_id: sessionId,
        user_id: user.id,
        speaker: 'player',
        transcript: message,
        boss_state: session.boss_state,
        damage_to_boss: resolved.judgement.damageToBoss,
        damage_to_player: 0,
      },
      {
        session_id: sessionId,
        user_id: user.id,
        speaker: 'ignis',
        transcript: resolved.judgement.speech,
        boss_state: resolved.judgement.nextState,
        damage_to_boss: 0,
        damage_to_player: resolved.judgement.damageToPlayer,
      },
    ])
    .select('id, speaker, transcript, boss_state, damage_to_boss, damage_to_player, created_at')

  if (resolved.outcome) {
    const column = resolved.outcome === 'victory' ? 'victories' : 'defeats'
    const { data: profile } = await supabase
      .from('profiles')
      .select('victories, defeats')
      .eq('id', user.id)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({ [column]: (profile[column] ?? 0) + 1 })
        .eq('id', user.id)
    }
  }

  const rows = inserted ?? []

  return Response.json({
    judgement: resolved.judgement,
    absorbedByShield: resolved.absorbedByShield,
    outcome: resolved.outcome,
    session: {
      id: sessionId,
      playerHealth: resolved.playerHealth,
      shieldCharge: resolved.shieldCharge,
      bossHealth: resolved.bossHealth,
      bossState: resolved.judgement.nextState,
      currentRiddleIndex: resolved.riddleIndex,
      turnCount: session.turn_count + 1,
      outcome: resolved.outcome,
      isActive: resolved.outcome === null,
    },
    entries: rows.map((r) => ({
      id: r.id,
      speaker: r.speaker,
      transcript: r.transcript,
      bossState: r.boss_state,
      damageToBoss: r.damage_to_boss,
      damageToPlayer: r.damage_to_player,
      createdAt: r.created_at,
    })),
  })
}
