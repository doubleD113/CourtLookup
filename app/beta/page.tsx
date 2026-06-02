'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

function BetaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('next') || '/search'
  const magicToken = searchParams.get('token')

  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const triedMagic = useRef(false)

  async function submit(value: string) {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/beta/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: value }),
      })
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid invite code' : 'Sign-in failed')
        return false
      }
      router.replace(redirectTo)
      router.refresh()
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (magicToken && !triedMagic.current) {
      triedMagic.current = true
      submit(magicToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magicToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit(token)
  }

  if (magicToken && !error) {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center space-y-4">
        <svg
          className="animate-spin h-8 w-8 text-orange-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <h1 className="text-base font-semibold text-slate-900">Signing you in…</h1>
          <p className="text-sm text-slate-500 mt-1">One sec.</p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900">CourtLookup beta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter your invite code to access the directory.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="token" className="text-xs font-medium text-slate-600">
          Invite code
        </label>
        <input
          id="token"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={submitting}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-500 focus:outline-none text-sm font-mono disabled:bg-slate-100"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || token.length === 0}
        className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {submitting && (
          <svg
            className="animate-spin h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path
              d="M22 12a10 10 0 0 1-10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
        {submitting ? 'Verifying…' : 'Enter beta'}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Don&apos;t have a code? <a href="/" className="underline">Back to landing page</a>
      </p>
    </form>
  )
}

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <BetaForm />
      </Suspense>
    </div>
  )
}
