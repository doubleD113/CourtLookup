import SearchBar from '@/components/SearchBar'
import MapPreview from '@/components/MapPreview'
import { prisma } from '@/lib/prisma'

type IconName = 'pin' | 'link' | 'filter'

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'pin',
    title: 'Verified Directory',
    description:
      'Every court is manually checked. We show a "last verified" date so you know how fresh the data is.',
  },
  {
    icon: 'link',
    title: 'Direct Booking Links',
    description:
      'No middleman. We link straight to each venue\'s own booking page so you book directly.',
  },
  {
    icon: 'filter',
    title: 'Filter & Find',
    description:
      'Filter by distance, facility type, or indoor/outdoor. Find exactly the court you need.',
  },
]

function FeatureIcon({ name }: { name: IconName }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    case 'link':
      return (
        <svg {...common}>
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
        </svg>
      )
    case 'filter':
      return (
        <svg {...common}>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
          <circle cx="9" cy="7" r="2.25" fill="white" />
          <circle cx="15" cy="12" r="2.25" fill="white" />
          <circle cx="8" cy="17" r="2.25" fill="white" />
        </svg>
      )
  }
}

const STEPS = [
  { number: '01', title: 'Search', description: 'Enter your suburb or postcode' },
  { number: '02', title: 'Browse', description: 'See courts nearby with key details' },
  { number: '03', title: 'Book', description: 'Click through to book on the venue\'s own site' },
]

export default async function Home() {
  const PREVIEW_STATES = ['VIC', 'NSW', 'QLD'] as const
  const perStateCourts = await Promise.all(
    PREVIEW_STATES.map((state) =>
      prisma.court.findMany({
        where: { hiddenAt: null, state },
        select: { id: true, name: true, latitude: true, longitude: true },
        orderBy: { verifiedAt: { sort: 'desc', nulls: 'last' } },
        take: 10,
      })
    )
  )
  const previewCourts = perStateCourts.flat()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="text-white font-bold text-xl tracking-tight">CourtLookup</span>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#" className="hover:text-white transition-colors">About</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-slate-900 pt-16 min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy + search */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 text-sm px-3 py-1.5 rounded-full mb-8">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                Melbourne, Sydney &amp; Brisbane now listed
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Find Basketball Courts
                <span className="text-orange-400"> Near You</span>
              </h1>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
                Australia&apos;s basketball court directory. Search by suburb or postcode,
                get court details, and book directly through their official site.
              </p>
              <SearchBar />
              <p className="text-slate-500 text-sm mt-4">
                Covering Melbourne, Sydney &amp; Brisbane &middot; more cities coming soon
              </p>
            </div>
            {/* Right: map preview */}
            <div>
              <MapPreview courts={previewCourts} />
              <p className="text-slate-500 text-xs text-center mt-3">
                Showing {previewCourts.length} verified courts across Melbourne, Sydney &amp; Brisbane &mdash; tap a marker to view details
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pt-20 pb-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Built for finding courts, not scraping them</h2>
            <p className="text-slate-500 mt-3 text-lg">Accurate, curated data — updated regularly, not in real-time</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 text-orange-500 mb-4">
                  <FeatureIcon name={f.icon} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="pt-16 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="text-center bg-slate-50 border border-slate-200 rounded-2xl p-8"
              >
                <div className="text-5xl font-bold text-orange-500 mb-2">{step.number}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold">CourtLookup</span>
          <p className="text-slate-500 text-sm">
            A directory for finding indoor basketball courts in Australia.
          </p>
        </div>
      </footer>
    </div>
  )
}
