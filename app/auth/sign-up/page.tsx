import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

export default async function SignUpPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/battle')

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link
          href="/"
          className="font-serif text-xs tracking-[0.4em] text-muted-foreground uppercase transition-colors hover:text-primary"
        >
          Echoes of the Scale
        </Link>
        <h1 className="text-ember-glow font-serif text-3xl font-bold tracking-wide text-balance">
          Forge a Name
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          The dragon keeps a ledger of every challenger. Yours begins now.
        </p>
      </div>

      <AuthForm mode="sign-up" />

      <p className="text-sm text-muted-foreground">
        Already have a name?{' '}
        <Link href="/auth/login" className="text-primary underline underline-offset-4">
          Return to the hall
        </Link>
      </p>
    </main>
  )
}
