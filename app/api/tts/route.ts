import { STATE_META } from '@/lib/game/content'
import type { BossState } from '@/lib/game/types'
import { createClient } from '@/lib/supabase/server'

/** A deep, gravelly preset voice. Override with ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
const MODEL_ID = 'eleven_turbo_v2_5'

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    // Voice is optional — the duel is fully playable in silence.
    return Response.json({ error: 'voice_unconfigured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { text?: string; state?: BossState }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim().slice(0, 900)
  if (!text) {
    return Response.json({ error: 'Nothing to speak.' }, { status: 400 })
  }

  const meta = STATE_META[body.state ?? 'cocky'] ?? STATE_META.cocky
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        // The dragon's delivery shifts with his emotional state.
        voice_settings: {
          stability: meta.voice.stability,
          similarity_boost: meta.voice.similarityBoost,
          style: meta.voice.style,
          speed: meta.voice.speed,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    console.log('[v0] ElevenLabs error', upstream.status, detail.slice(0, 200))
    return Response.json({ error: 'The dragon has lost his voice.' }, { status: 502 })
  }

  // Stream the audio straight through so the first syllable arrives fast.
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
