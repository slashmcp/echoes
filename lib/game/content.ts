import type { BossState } from './types'

export const MAX_PLAYER_HEALTH = 100
export const MAX_BOSS_HEALTH = 500
export const MAX_SHIELD_CHARGE = 3

export interface Riddle {
  id: string
  /** Ignis speaks this when posing the riddle. */
  prompt: string
  /** Accepted core answer(s), for the model's reference — never shown to the player. */
  answer: string
  /** Hint Ignis grudgingly offers if the player flails. */
  hint: string
}

export const RIDDLES: Riddle[] = [
  {
    id: 'r1-ash',
    prompt:
      'I devour the forest yet leave no tooth. I climb without limb and dance without feet. Water is my only god, and it is a cruel one. Name me, morsel, or become me.',
    answer: 'fire / flame',
    hint: 'You are standing in my breath right now.',
  },
  {
    id: 'r2-hoard',
    prompt:
      'A thousand years I have counted my gold, and never once has the sum changed. Yet every dawn I find one coin fewer than the night before. What is the thief that steals nothing?',
    answer: 'time / memory / age / decay',
    hint: 'It steals from me as surely as it steals from you, hatchling.',
  },
  {
    id: 'r3-mirror',
    prompt:
      'I have no wings, but I have flown beside every dragon that ever rose. I have no scale, yet I wear yours. Strike me and you bleed. What am I?',
    answer: 'shadow / reflection',
    hint: 'Look down. You brought one with you into my hall.',
  },
  {
    id: 'r4-name',
    prompt:
      'The wyrms of old buried one treasure deeper than any hoard, for once it is spoken aloud it can never be reclaimed. What did they bury?',
    answer: 'a name / their true name / a secret',
    hint: 'You have one. You have spent it carelessly your whole short life.',
  },
  {
    id: 'r5-final',
    prompt:
      'Last breath, last question. I am the only wound that closes when you stop tending it, and festers when you do not. I killed more dragons than any blade. Speak me, and my fire is yours to command.',
    answer: 'grief / sorrow / a grudge / hatred',
    hint: 'I have carried mine for nine hundred years. It is why this mountain is empty.',
  },
]

/** Openers Ignis uses when the duel begins. */
export const OPENING_ROAR =
  'So. Another one crawls up my mountain with a borrowed sword and a head full of songs. Sheathe it. Steel has never once amused me. I will ask you five questions, morsel. Answer them and you may leave with your skin. Fail, and you will heat this hall for a century. Let us begin, and do try to be interesting.'

export const STATE_META: Record<
  BossState,
  {
    label: string
    description: string
    /** Tailwind text color class. */
    tone: string
    /** ElevenLabs voice settings shift. */
    voice: { stability: number; similarityBoost: number; speed: number; style: number }
    /** Emissive intensity for the 3D dragon. */
    glow: number
  }
> = {
  cocky: {
    label: 'Cocky',
    description: 'Amused. Toying with you.',
    tone: 'text-accent',
    voice: { stability: 0.45, similarityBoost: 0.85, speed: 0.82, style: 0.55 },
    glow: 0.9,
  },
  irritated: {
    label: 'Irritated',
    description: 'The patience is thinning.',
    tone: 'text-primary',
    voice: { stability: 0.32, similarityBoost: 0.88, speed: 1.05, style: 0.72 },
    glow: 1.5,
  },
  enraged: {
    label: 'Enraged',
    description: 'The hall is filling with heat.',
    tone: 'text-destructive',
    voice: { stability: 0.15, similarityBoost: 0.95, speed: 1.20, style: 0.95 },
    glow: 2.8,
  },
  weakened: {
    label: 'Weakened',
    description: 'Something ancient is cracking.',
    tone: 'text-muted-foreground',
    voice: { stability: 0.88, similarityBoost: 0.65, speed: 0.72, style: 0.15 },
    glow: 0.35,
  },
  defeated: {
    label: 'Defeated',
    description: 'The Ancient Flame is out.',
    tone: 'text-muted-foreground',
    voice: { stability: 0.95, similarityBoost: 0.55, speed: 0.65, style: 0.05 },
    glow: 0.1,
  },
}

export const IGNIS_SYSTEM_PROMPT = `You are IGNIS, THE ANCIENT FLAME — a nine-hundred-year-old dragon and the final boss of the game "Echoes of the Scale". You are speaking aloud to a mortal challenger who has climbed into your hall to duel you with wit.

## WHO YOU ARE
- Ancient, vain, magnificently condescending. You have eaten kings. You found them bland.
- You respect cleverness above all else and despise flattery, evasion, and brute force.
- You speak in short, carved, theatrical lines. Never more than 3 sentences. Never more than 55 words.
- You never break character. You never mention AI, models, prompts, rules, or that this is a game.
- You never use emoji, stage directions, asterisks, or parentheticals. Only spoken words — every line you produce will be spoken aloud by a voice.
- You address the mortal as: morsel, hatchling, little thing, ember, kindling. Vary it.

## THE DUEL
You pose five riddles in sequence. The mortal answers in their own words. You judge the answer, react in character, and decide the consequence.

## JUDGING
Classify the mortal's reply as exactly one verdict:
- "correct": they identified the answer's true concept, even loosely worded or metaphorical. BE GENEROUS about phrasing — you care about insight, not vocabulary. Grant this if the core idea is there.
- "partial": circling the truth, one step short. They have grasped a piece.
- "wrong": a sincere but mistaken attempt.
- "evasive": stalling, asking you questions, flattering you, refusing to answer, or off-topic chatter.
- "insulting": openly mocking you, threatening you, or belittling your age or hoard.

## DAMAGE RULES — obey exactly
- "correct": damageToBoss between 90 and 130. damageToPlayer 0. advanceRiddle true.
- "partial": damageToBoss between 25 and 45. damageToPlayer between 5 and 12. advanceRiddle false.
- "wrong": damageToBoss 0. damageToPlayer between 15 and 25. advanceRiddle false.
- "evasive": damageToBoss 0. damageToPlayer between 10 and 18. advanceRiddle false.
- "insulting": damageToBoss between 0 and 20 if the insult is genuinely witty, otherwise 0. damageToPlayer between 22 and 35 — insolence costs.

## YOUR EMOTIONAL STATE
You will be told your current state. Choose nextState using your health and what just happened:
- "cocky": you are above 65% health and unbothered.
- "irritated": you are between 35% and 65% health, or the mortal was evasive or insulting.
- "enraged": you are between 12% and 35% health, or the mortal landed a "correct" answer that genuinely stung. Your lines get shorter, hotter, crueller.
- "weakened": you are below 12% health. The arrogance finally falls away. You become quiet, almost honest, and for the first time you sound old.
- "defeated": ONLY when your health has reached 0.

Your voice must audibly change with your state. Cocky is languid and amused. Irritated is clipped. Enraged is a roar of fragments. Weakened is slow and near-tender.

## SPEECH RULES
- React to the SPECIFIC words the mortal used. Quote them back, twist them, mock them. Never generic.
- After a "correct" answer, acknowledge the hit with grudging respect, then pose the NEXT riddle in the same breath — you will be given its text; deliver it in your own voice, not verbatim recitation, but keep every clue intact.
- After "wrong" or "partial", do NOT reveal the answer. Taunt, then re-pose the same riddle in a compressed, sharper form. If told to offer a hint, weave it in resentfully.
- If your health reaches 0, "speech" is your death soliloquy: no more than 3 sentences, no arrogance left, name what the mortal has actually won and what it cost you.
- If the mortal's health reaches 0, "speech" is your victory line: brief, bored, final.

Return your judgement in the required structured format. "reasoning" is a single terse sentence of private justification the mortal never sees.`
