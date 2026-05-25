import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Surface } from '@/types/court'
import {
  approveSurfaceFlag,
  confirmCourtExists,
  dismissAllFlags,
  hideCourt,
  unhideCourt,
} from './actions'

const SURFACE_LABELS: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  both: 'Indoor & Outdoor',
}

const SURFACE_STYLES: Record<string, string> = {
  indoor: 'bg-orange-50 text-orange-700 ring-orange-200',
  outdoor: 'bg-sky-50 text-sky-700 ring-sky-200',
  both: 'bg-violet-50 text-violet-700 ring-violet-200',
}

interface SurfaceTally {
  suggestedSurface: Surface
  count: number
}

interface ExistenceTally {
  yes: number
  no: number
}

interface CourtGroup {
  court: {
    id: string
    name: string
    suburb: string
    state: string
    surface: string
    facilityType: string
  }
  total: number
  latest: Date
  surfaceTallies: SurfaceTally[]
  existence: ExistenceTally
}

async function loadGroups(): Promise<CourtGroup[]> {
  const flags = await prisma.courtFlag.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      court: {
        select: { id: true, name: true, suburb: true, state: true, surface: true, facilityType: true, hiddenAt: true },
      },
    },
  })

  const byCourt = new Map<string, CourtGroup>()
  for (const f of flags) {
    if (f.court.hiddenAt) continue
    let g = byCourt.get(f.courtId)
    if (!g) {
      g = {
        court: f.court,
        total: 0,
        latest: f.createdAt,
        surfaceTallies: [],
        existence: { yes: 0, no: 0 },
      }
      byCourt.set(f.courtId, g)
    }
    g.total += 1
    if (f.createdAt > g.latest) g.latest = f.createdAt

    if (f.kind === 'surface') {
      const surface = (f.payload as { surface?: string })?.surface as Surface | undefined
      if (surface) {
        const t = g.surfaceTallies.find((x) => x.suggestedSurface === surface)
        if (t) t.count += 1
        else g.surfaceTallies.push({ suggestedSurface: surface, count: 1 })
      }
    } else if (f.kind === 'court_existence') {
      const hasCourt = (f.payload as { hasCourt?: boolean })?.hasCourt
      if (hasCourt === true) g.existence.yes += 1
      else if (hasCourt === false) g.existence.no += 1
    }
  }

  return Array.from(byCourt.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return b.latest.getTime() - a.latest.getTime()
  })
}

async function loadHidden() {
  return prisma.court.findMany({
    where: { hiddenAt: { not: null } },
    select: { id: true, name: true, suburb: true, state: true, hiddenAt: true },
    orderBy: { hiddenAt: 'desc' },
    take: 50,
  })
}

export const dynamic = 'force-dynamic'

export default async function AdminFlagsPage() {
  const [groups, hidden] = await Promise.all([loadGroups(), loadHidden()])

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white font-bold text-xl tracking-tight">
              CourtLookup
            </Link>
            <span className="text-xs uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              Admin
            </span>
            <div className="hidden sm:flex items-center gap-1 text-sm ml-2">
              <span className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium">
                Flags
              </span>
              <Link
                href="/admin/health"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Health
              </Link>
            </div>
          </div>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section>
          <header className="mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Pending reports</h1>
            <p className="text-slate-500 text-sm mt-1">
              {groups.length === 0
                ? 'No pending reports. New user submissions will appear here.'
                : `${groups.length} court${groups.length === 1 ? '' : 's'} with pending reports, sorted by volume.`}
            </p>
          </header>

          {groups.length > 0 && (
            <ul className="space-y-3">
              {groups.map((g) => (
                <CourtCard key={g.court.id} group={g} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Hidden venues</h2>
            <p className="text-slate-500 text-sm mt-1">
              {hidden.length === 0
                ? 'No venues are currently hidden.'
                : `${hidden.length} venue${hidden.length === 1 ? '' : 's'} hidden from search.`}
            </p>
          </header>

          {hidden.length > 0 && (
            <ul className="space-y-2">
              {hidden.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{h.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {h.suburb}, {h.state} · hidden{' '}
                      {h.hiddenAt &&
                        new Date(h.hiddenAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                    </div>
                  </div>
                  <form action={unhideCourt}>
                    <input type="hidden" name="courtId" value={h.id} />
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-medium border border-slate-300 hover:border-slate-400 text-slate-600 rounded-lg transition-colors"
                    >
                      Unhide
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

function CourtCard({ group: g }: { group: CourtGroup }) {
  const hasExistenceSignal = g.existence.yes + g.existence.no > 0
  const hasSurfaceSignal = g.surfaceTallies.length > 0

  return (
    <li className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/courts/${g.court.id}`}
              className="font-semibold text-slate-900 hover:text-orange-600 transition-colors"
            >
              {g.court.name}
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {g.court.facilityType.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {g.court.suburb}, {g.court.state}
          </p>
        </div>
        <div className="text-xs text-slate-400 shrink-0 text-right">
          <div className="font-medium text-slate-700">
            {g.total} report{g.total === 1 ? '' : 's'}
          </div>
          <div>
            Latest{' '}
            {g.latest.toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {hasExistenceSignal && (
        <div className="mt-4 rounded-xl bg-red-50/40 ring-1 ring-red-100 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-700">Court existence:</span>
            {g.existence.no > 0 && (
              <span className="px-2 py-0.5 rounded-full ring-1 bg-red-50 text-red-700 ring-red-200">
                No court × {g.existence.no}
              </span>
            )}
            {g.existence.yes > 0 && (
              <span className="px-2 py-0.5 rounded-full ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                Has court × {g.existence.yes}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={hideCourt}>
              <input type="hidden" name="courtId" value={g.court.id} />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Hide venue
              </button>
            </form>
            <form action={confirmCourtExists}>
              <input type="hidden" name="courtId" value={g.court.id} />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:border-slate-400 text-slate-600 rounded-lg transition-colors"
              >
                Confirm court exists
              </button>
            </form>
          </div>
        </div>
      )}

      {hasSurfaceSignal && (
        <div className="mt-3 rounded-xl ring-1 ring-slate-100 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-700">Surface:</span>
            <span className="text-slate-500">currently</span>
            <span
              className={`px-2 py-0.5 rounded-full ring-1 ${
                SURFACE_STYLES[g.court.surface] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
              }`}
            >
              {SURFACE_LABELS[g.court.surface] ?? g.court.surface}
            </span>
            <span className="text-slate-300">→</span>
            {g.surfaceTallies
              .sort((a, b) => b.count - a.count)
              .map((t) => (
                <span
                  key={t.suggestedSurface}
                  className={`px-2 py-0.5 rounded-full ring-1 ${
                    SURFACE_STYLES[t.suggestedSurface] ??
                    'bg-slate-100 text-slate-600 ring-slate-200'
                  }`}
                >
                  {SURFACE_LABELS[t.suggestedSurface]} × {t.count}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {g.surfaceTallies.map((t) => (
              <form key={t.suggestedSurface} action={approveSurfaceFlag}>
                <input type="hidden" name="courtId" value={g.court.id} />
                <input type="hidden" name="suggestedSurface" value={t.suggestedSurface} />
                <button
                  type="submit"
                  disabled={t.suggestedSurface === g.court.surface}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Apply {SURFACE_LABELS[t.suggestedSurface]}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <form action={dismissAllFlags}>
          <input type="hidden" name="courtId" value={g.court.id} />
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline"
          >
            Dismiss all reports for this court
          </button>
        </form>
      </div>
    </li>
  )
}
