import { Brain, Flame, Mic, ShieldHalf } from 'lucide-react'
import Link from 'next/link'

import { GuestEnterButton } from '@/components/auth/guest-enter-button'
import { Button } from '@/components/ui/button'
import { RIDDLES } from '@/lib/game/content'
import { createClient } from '@/lib/supabase/server'

const PILLARS = [
  {
    icon: Brain,
    title: 'He reasons',
    body: 'Ignis judges the meaning of your words, not keywords. Insight lands. Bluffing does not.',
  },
  {
    icon: Flame,
    title: 'He adapts',
    body: 'Cocky, irritated, enraged, weakened — his temper shifts the light, the heat, and his voice.',
  },
  {
    icon: Mic,
    title: 'He speaks',
    body: 'Every line is delivered aloud, with a cadence that hardens as the duel turns against him.',
  },
  {
    icon: ShieldHalf,
    title: 'You are fragile',
    body: 'A hundred points of life. Each correct answer earns one Crystal Shield. Insolence costs double.',
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="relative min-h-svh overflow-hidden">
      {/* Volcanic backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 105%, oklch(0.5 0.19 40 / 55%) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, oklch(0.68 0.21 42 / 45%) 0%, transparent 65%)',
        }}
      />
      <div aria-hidden className="scanline-veil pointer-events-none absolute inset-0 opacity-30" />

      {/* Rising embers */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-svh">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-0 size-1 rounded-full bg-primary"
            style={{
              left: `${(i * 4.6 + 3) % 100}%`,
              animation: `ember-rise ${5 + (i % 5) * 1.4}s linear ${i * 0.42}s infinite`,
              boxShadow: '0 0 8px oklch(0.7 0.2 45 / 80%)',
            }}
          />
        ))}
      </div>

      <div className="relative flex min-h-svh flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <span className="font-serif text-[10px] font-bold tracking-[0.42em] text-primary uppercase">
            Echoes of the Scale
          </span>
          <Link
            href={user ? '/battle' : '/auth/login'}
            className="font-serif text-[10px] tracking-[0.28em] text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            {user ? 'Resume duel' : 'Sign in'}
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center sm:px-10">
          <p className="font-serif text-[10px] tracking-[0.5em] text-muted-foreground uppercase">
            Nine hundred years · Zero survivors
          </p>

          <h1 className="text-ember-glow max-w-4xl font-serif text-4xl leading-[1.05] font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Ignis has eaten kings.
            <br />
            <span className="text-primary">He found them bland.</span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            An ancient dragon waits at the summit with {RIDDLES.length} riddles and no patience. He
            hears every word you choose, judges the thought behind it, and burns hotter the closer you
            get. Steel is useless here. Wit is the only weapon that has ever drawn his blood.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              render={
                <Link href={user ? '/battle' : '/auth/sign-up'}>
                  <Flame className="size-4" />
                  {user ? 'Enter the hall' : 'Climb the mountain'}
                </Link>
              }
              size="lg"
              className="gap-2 font-serif tracking-[0.2em] uppercase"
            />
            {!user && (
              <Button
                render={<Link href="/auth/login">I have been here before</Link>}
                size="lg"
                variant="ghost"
                className="font-serif tracking-[0.2em] uppercase"
              />
            )}
          </div>

          {/* Guest access — always visible */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="h-px w-16 bg-border" />
              <span className="font-serif text-[10px] tracking-[0.3em] text-muted-foreground/60 uppercase">or</span>
              <div className="h-px w-16 bg-border" />
            </div>
            <GuestEnterButton
              label="Enter as Guest"
              className="font-serif text-[11px] tracking-[0.2em] text-muted-foreground uppercase hover:text-primary"
            />
            <p className="text-[10px] tracking-widest text-muted-foreground/50 uppercase">
              No account needed — your duel is saved in this session
            </p>
          </div>

          {/* First riddle as a teaser */}
          <blockquote className="panel-etched mt-4 max-w-lg border-l-2 border-primary/60 p-5 text-left">
            <p className="font-serif text-[15px] leading-relaxed text-foreground text-pretty">
              {RIDDLES[0].prompt}
            </p>
            <footer className="mt-3 font-serif text-[10px] tracking-[0.3em] text-primary uppercase">
              — Ignis, the Ancient Flame
            </footer>
          </blockquote>
        </div>

        <section
          aria-label="How the duel works"
          className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="flex flex-col gap-2 bg-background/85 p-6">
              <Icon aria-hidden className="size-5 text-primary" />
              <h2 className="font-serif text-xs font-bold tracking-[0.24em] uppercase">{title}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
