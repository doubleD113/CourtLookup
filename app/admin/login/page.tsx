'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid token' : 'Login failed')
        return
      }
      router.replace('/admin/flags')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Enter the admin token to continue.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="token" className="text-xs font-medium text-slate-600">
            Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            autoFocus
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-500 focus:outline-none text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || token.length === 0}
          className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
