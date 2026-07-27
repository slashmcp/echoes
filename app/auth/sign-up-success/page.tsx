import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="font-serif text-xs tracking-[0.4em] text-muted-foreground uppercase">
        Echoes of the Scale
      </p>
      <h1 className="text-ember-glow font-serif text-3xl font-bold tracking-wide text-balance">
        Your Name Is Written
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        Check your inbox and confirm the message we sent. Once confirmed, the mountain path opens
        and Ignis will be told you are coming.
      </p>
      <Link
        href="/auth/login"
        className="font-serif text-sm tracking-widest text-primary uppercase underline underline-offset-4"
      >
        Return to the hall
      </Link>
    </main>
  )
}
