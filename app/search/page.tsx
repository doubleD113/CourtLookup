import { prisma } from '@/lib/prisma'
import CourtCard from '@/components/CourtCard'
import Link from 'next/link'
import { Court } from '@/types/court'

interface Props {
  searchParams: Promise<{ q?: string; facilityType?: string }>
}

async function searchCourts(q: string, facilityType?: string): Promise<Court[]> {
  const isPostcode = /^\d{4}$/.test(q.trim())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = isPostcode
    ? { postcode: q.trim() }
    : { suburb: { contains: q.trim(), mode: 'insensitive' } }

  if (facilityType && facilityType !== 'all') {
    where.facilityType = facilityType
  }

  return prisma.court.findMany({ where, orderBy: { name: 'asc' }, take: 100 }) as Promise<Court[]>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, facilityType } = await searchParams
  const query = q?.trim() ?? ''

  const courts = query ? await searchCourts(query, facilityType) : []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-white font-bold text-xl tracking-tight">
              CourtLookup
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search header */}
        <div className="mb-8">
          <form method="GET" action="/search" className="flex flex-col sm:flex-row gap-3">
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Enter suburb or postcode..."
              className="flex-1 px-5 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-7 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </form>

          {/* Filter row */}
          {query && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {['all', 'dedicated_court', 'community_centre', 'gym'].map((type) => {
                const labels: Record<string, string> = {
                  all: 'All types',
                  dedicated_court: 'Dedicated courts',
                  community_centre: 'Community centres',
                  gym: 'Gyms',
                }
                const isActive = (facilityType ?? 'all') === type
                return (
                  <Link
                    key={type}
                    href={`/search?q=${encodeURIComponent(query)}&facilityType=${type}`}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {labels[type]}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Results */}
        {!query ? (
          <p className="text-slate-500 text-center py-20">Enter a suburb or postcode to find courts.</p>
        ) : courts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-700 font-medium">No courts found for &ldquo;{query}&rdquo;</p>
            <p className="text-slate-500 text-sm mt-2">Try a nearby suburb or check the spelling.</p>
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-sm mb-4">
              {courts.length} court{courts.length !== 1 ? 's' : ''} found
              {query && (
                <> near <span className="font-medium text-slate-700">{query}</span></>
              )}
            </p>
            <div className="flex flex-col gap-3">
              {courts.map((court) => (
                <CourtCard key={court.id} court={court} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
