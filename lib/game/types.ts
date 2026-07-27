export type BossState = 'cocky' | 'irritated' | 'enraged' | 'weakened' | 'defeated'

export type Speaker = 'player' | 'ignis' | 'system'

export type Verdict = 'correct' | 'partial' | 'wrong' | 'evasive' | 'insulting'

export type Outcome = 'victory' | 'defeat'

export interface DialogueEntry {
  id: string
  speaker: Speaker
  transcript: string
  bossState: BossState | null
  damageToBoss: number
  damageToPlayer: number
  createdAt: string
}

export interface GameSession {
  id: string
  playerHealth: number
  shieldCharge: number
  bossHealth: number
  bossState: BossState
  currentRiddleIndex: number
  turnCount: number
  outcome: Outcome | null
  isActive: boolean
}

export interface Profile {
  id: string
  username: string
  victories: number
  defeats: number
}

/** What the model returns for a single exchange. */
export interface BossJudgement {
  verdict: Verdict
  reasoning: string
  speech: string
  nextState: BossState
  damageToBoss: number
  damageToPlayer: number
  advanceRiddle: boolean
}

export interface BattleTurnResult {
  session: GameSession
  playerEntry: DialogueEntry
  ignisEntry: DialogueEntry
  judgement: BossJudgement
  riddlePrompt: string | null
}
