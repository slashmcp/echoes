import {
  MAX_BOSS_HEALTH,
  MAX_PLAYER_HEALTH,
  MAX_SHIELD_CHARGE,

} from './content'
import type { BossJudgement, BossState, Verdict } from './types'

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)))

/**
 * The model proposes damage; the server decides it. This keeps the fight
 * balanced and un-cheatable even if the model is talked into being generous.
 */
const DAMAGE_BOUNDS: Record<Verdict, { boss: [number, number]; player: [number, number] }> = {
  correct: { boss: [90, 130], player: [0, 0] },
  partial: { boss: [25, 45], player: [5, 12] },
  wrong: { boss: [0, 0], player: [15, 25] },
  evasive: { boss: [0, 0], player: [10, 18] },
  insulting: { boss: [0, 20], player: [22, 35] },
}

export function stateFromHealth(bossHealth: number, fallback: BossState): BossState {
  if (bossHealth <= 0) return 'defeated'
  const pct = bossHealth / MAX_BOSS_HEALTH
  if (pct < 0.12) return 'weakened'
  if (pct < 0.35) return 'enraged'
  if (pct < 0.65) return fallback === 'cocky' ? 'irritated' : fallback
  return fallback === 'weakened' || fallback === 'defeated' ? 'cocky' : fallback
}

export interface ResolvedTurn {
  judgement: BossJudgement
  bossHealth: number
  playerHealth: number
  shieldCharge: number
  riddleIndex: number
  absorbedByShield: number
  outcome: 'victory' | 'defeat' | null
}

export function resolveTurn(
  raw: BossJudgement,
  current: {
    bossHealth: number
    playerHealth: number
    shieldCharge: number
    riddleIndex: number
  },
): ResolvedTurn {
  const bounds = DAMAGE_BOUNDS[raw.verdict] ?? DAMAGE_BOUNDS.wrong

  const damageToBoss = clamp(raw.damageToBoss, bounds.boss[0], bounds.boss[1])
  const rawDamageToPlayer = clamp(raw.damageToPlayer, bounds.player[0], bounds.player[1])

  // Crystal Shield: each charge absorbs one incoming hit entirely.
  let shieldCharge = current.shieldCharge
  let absorbedByShield = 0
  let damageToPlayer = rawDamageToPlayer
  if (damageToPlayer > 0 && shieldCharge > 0) {
    absorbedByShield = damageToPlayer
    damageToPlayer = 0
    shieldCharge -= 1
  }

  const bossHealth = clamp(current.bossHealth - damageToBoss, 0, MAX_BOSS_HEALTH)
  const playerHealth = clamp(current.playerHealth - damageToPlayer, 0, MAX_PLAYER_HEALTH)

  // A correct answer both advances the riddle and earns a shield charge.
  const advance = raw.verdict === 'correct'
  const riddleIndex = advance
    ? Math.min(current.riddleIndex + 1, 5)
    : current.riddleIndex
  if (advance) {
    shieldCharge = clamp(shieldCharge + 1, 0, MAX_SHIELD_CHARGE)
  }

  const outcome: 'victory' | 'defeat' | null =
    bossHealth <= 0 ? 'victory' : playerHealth <= 0 ? 'defeat' : null

  const nextState: BossState =
    outcome === 'victory'
      ? 'defeated'
      : stateFromHealth(bossHealth, raw.nextState ?? 'cocky')

  return {
    judgement: {
      ...raw,
      damageToBoss,
      damageToPlayer,
      nextState,
      advanceRiddle: advance,
    },
    bossHealth,
    playerHealth,
    shieldCharge,
    riddleIndex,
    absorbedByShield,
    outcome,
  }
}



const STRIKE_IGNIS_LINES = [
  "You scratched a scale. One. Scale. I've had fleas draw more blood.",
  "That was — a touch? I thought a moth had landed. Swing harder, morsel.",
  "Brave. Also completely futile. Your sword hand is shaking.",
  "Oh. Oh, you hit me. I felt that the way mountains feel rain. Almost.",
  "Your ancestors would weep at that blow. Were they all this soft?",
  "I've been scorched by stars. You are not a star.",
  "Is that the best your body can produce? Disappointing. The riddle would have gone better.",
  "You dented my pride, not my hide. For that, you owe me blood.",
  "Vigour without wit. The most expensive kind of useless.",
  "Physical courage. How quaint. And how entirely wrong for this hall.",
  "Nine hundred years of sleep and you wake me with *that*? Swing again. I want to laugh again.",
  "The dragon yawns. You notice a tooth is larger than you are. You swing anyway.",
] as const

export interface ResolvedStrike {
  damageToBoss: number
  damageToPlayer: number
  ignisLine: string
  bossHealth: number
  playerHealth: number
  shieldCharge: number
  absorbedByShield: number
  outcome: 'victory' | 'defeat' | null
  nextState: BossState
}

export function resolveStrike(current: {
  bossHealth: number
  playerHealth: number
  shieldCharge: number
  bossState: BossState
}): ResolvedStrike {
  const damageToBoss = clamp(
    Math.floor(Math.random() * 16) + 15,
    15,
    30,
  )
  const rawDamageToPlayer = clamp(
    Math.floor(Math.random() * 11) + 18,
    18,
    28,
  )

  let shieldCharge = current.shieldCharge
  let absorbedByShield = 0
  let damageToPlayer = rawDamageToPlayer
  if (damageToPlayer > 0 && shieldCharge > 0) {
    absorbedByShield = damageToPlayer
    damageToPlayer = 0
    shieldCharge -= 1
  }

  const bossHealth = clamp(current.bossHealth - damageToBoss, 0, MAX_BOSS_HEALTH)
  const playerHealth = clamp(current.playerHealth - damageToPlayer, 0, MAX_PLAYER_HEALTH)
  const outcome: 'victory' | 'defeat' | null =
    bossHealth <= 0 ? 'victory' : playerHealth <= 0 ? 'defeat' : null

  const nextState: BossState =
    outcome === 'victory' ? 'defeated' : stateFromHealth(bossHealth, current.bossState)

  const ignisLine =
    STRIKE_IGNIS_LINES[Math.floor(Math.random() * STRIKE_IGNIS_LINES.length)]

  return {
    damageToBoss,
    damageToPlayer,
    ignisLine,
    bossHealth,
    playerHealth,
    shieldCharge,
    absorbedByShield,
    outcome,
    nextState,
  }
}
