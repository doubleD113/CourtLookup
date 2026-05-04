'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter suburb or postcode..."
        className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-base"
      />
      <button
        type="submit"
        className="px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
      >
        Find Courts
      </button>
    </form>
  )
}
