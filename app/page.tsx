import SearchBar from '@/components/SearchBar'
import MapPreview from '@/components/MapPreview'

const FEATURES = [
  {
    icon: '📍',
    title: 'Verified Directory',
    description:
      'Every court is manually checked. We show a "last verified" date so you know how fresh the data is.',
  },
  {
    icon: '🔗',
    title: 'Direct Booking Links',
    description:
      'No middleman. We link straight to each venue\'s own booking page so you book directly.',
  },
  {
    icon: '🔍',
    title: 'Filter & Find',
    description:
      'Filter by distance, facility type, or indoor/outdoor. Find exactly the court you need.',
  },
]

const STEPS = [
  { number: '01', title: 'Search', description: 'Enter your suburb or postcode' },
  { number: '02', title: 'Browse', description: 'See courts nearby with key details' },
  { number: '03', title: 'Book', description: 'Click through to book on the venue\'s own site' },
]

export default function Home() {
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
                Melbourne courts now listed
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Find Indoor Basketball Courts
                <span className="text-orange-400"> Near You</span>
              </h1>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
                Australia&apos;s basketball court directory. Search by suburb or postcode,
                get court details, and book directly through their official site.
              </p>
              <SearchBar />
              <p className="text-slate-500 text-sm mt-4">
                Currently covering Melbourne &middot; Sydney &amp; Brisbane coming soon
              </p>
            </div>
            {/* Right: map preview */}
            <div>
              <MapPreview />
              <p className="text-slate-500 text-xs text-center mt-3">
                Sample courts shown &mdash; sign up to see all venues
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Built for finding courts, not scraping them</h2>
            <p className="text-slate-500 mt-3 text-lg">Accurate, curated data — updated regularly, not in real-time</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-5xl font-bold text-orange-100 mb-2">{step.number}</div>
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
