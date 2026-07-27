'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface AuthFormProps {
  mode: 'login' | 'sign-up'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const supabase = createClient()

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
            data: { username: username.trim() },
          },
        })
        if (signUpError) throw signUpError
        router.push('/auth/sign-up-success')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/battle')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
      setIsPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel-etched flex w-full max-w-sm flex-col gap-5 rounded-lg border border-border p-6"
    >
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="username" className="text-xs tracking-widest uppercase">
            Your name
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ashwalker"
            required
            minLength={2}
            maxLength={24}
            autoComplete="username"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-xs tracking-widest uppercase">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-xs tracking-widest uppercase">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="font-serif tracking-widest uppercase">
        {isPending ? 'Ascending…' : isSignUp ? 'Climb the mountain' : 'Enter the hall'}
      </Button>
    </form>
  )
}
