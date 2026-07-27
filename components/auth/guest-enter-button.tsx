'use client'

import { Loader2, Swords } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface GuestEnterButtonProps {
  size?: 'default' | 'lg' | 'sm'
  className?: string
  label?: string
  /** If the user already has a session (real or anonymous), skip sign-in and go straight to /battle. */
  alreadyAuthenticated?: boolean
}

export function GuestEnterButton({
  size = 'lg',
  className,
  label = 'Enter as Guest',
  alreadyAuthenticated = false,
}: GuestEnterButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGuestPlay() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInAnonymously()

    if (authError) {
      setError(
        authError.message.includes('not enabled')
          ? 'Enable Anonymous Sign-ins in your Supabase dashboard → Auth → Providers.'
          : authError.message,
      )
      setLoading(false)
      return
    }

    router.push('/battle')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={handleGuestPlay}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Swords className="size-4" />
        )}
        {loading ? 'Entering the hall…' : label}
      </Button>
      {error && (
        <p className="max-w-xs text-center text-[10px] leading-relaxed text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
