import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="font-serif text-xs tracking-[0.4em] text-muted-foreground uppercase">
        The path collapsed
      </p>
      <h1 className="font-serif text-3xl font-bold tracking-wide text-destructive text-balance">
        You Did Not Reach the Hall
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        {params.error ?? 'An unspecified error stopped you on the mountain path.'}
      </p>
      <Link
        href="/auth/login"
        className="font-serif text-sm tracking-widest text-primary uppercase underline underline-offset-4"
      >
        Try the climb again
      </Link>
    </main>
  )
}
