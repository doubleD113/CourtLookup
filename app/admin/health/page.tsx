import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { acknowledgeHealth, clearBookingUrl } from './actions'

function formatStatus(status: number, errorMsg: string | null): string {
  if (status === -1) return errorMsg ?? 'Network error'
  return `HTTP ${status}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadBrokenHealth() {
  return prisma.urlHealth.findMany({
    where: { status: { not: 200 } },
    orderBy: { checkedAt: 'desc' },
    include: {
      court: {
        select: { id: true, name: true, suburb: true, state: true, hiddenAt: true },
      },
    },
  })
}

async function loadSummary() {
  const [okCount, totalCount, lastCheck] = await Promise.all([
    prisma.urlHealth.count({ where: { status: 200 } }),
    prisma.urlHealth.count(),
    prisma.urlHealth.findFirst({ orderBy: { checkedAt: 'desc' }, select: { checkedAt: true } }),
  ])
  return { okCount, totalCount, lastCheckedAt: lastCheck?.checkedAt ?? null }
}

export const dynamic = 'force-dynamic'

export default async function AdminHealthPage() {
  const [rows, summary] = await Promise.all([loadBrokenHealth(), loadSummary()])
  const visible = rows.filter((r) => !r.court.hiddenAt)

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
              <Link
                href="/admin/flags"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Flags
              </Link>
              <span className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium">
                Health
              </span>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Booking URL health</h1>
          <p className="text-slate-500 text-sm mt-1">
            {summary.totalCount === 0
              ? 'No URLs checked yet. Run the weekly cron or `npm run check:urls` locally.'
              : `${summary.okCount}/${summary.totalCount} URLs healthy${
                  summary.lastCheckedAt ? ` · last check ${formatDate(summary.lastCheckedAt)}` : ''
                }`}
          </p>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {visible.length === 0 ? 'No broken URLs' : `${visible.length} broken URL${visible.length === 1 ? '' : 's'}`}
          </h2>

          {visible.length === 0 ? (
            <p className="text-sm text-slate-500">
              Every checked booking URL returned HTTP 200 on the latest run.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => (
                <li key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/courts/${r.court.id}`}
                        className="font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {r.court.name}
                      </Link>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {r.court.suburb}, {r.court.state}
                      </p>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-xs text-slate-500 hover:text-orange-600 break-all"
                      >
                        {r.url}
                      </a>
                    </div>
                    <div className="text-xs text-right shrink-0">
                      <div className="font-medium text-red-700">{formatStatus(r.status, r.errorMsg)}</div>
                      <div className="text-slate-400 mt-0.5">Checked {formatDate(r.checkedAt)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={clearBookingUrl}>
                      <input type="hidden" name="courtId" value={r.court.id} />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                      >
                        Clear booking URL
                      </button>
                    </form>
                    <form action={acknowledgeHealth}>
                      <input type="hidden" name="courtId" value={r.court.id} />
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:border-slate-400 text-slate-600 rounded-lg transition-colors"
                      >
                        Acknowledge
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
