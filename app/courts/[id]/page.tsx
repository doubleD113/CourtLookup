import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BackButton from '@/components/BackButton'
import FlagSurfaceButton from '@/components/FlagSurfaceButton'
import type { Surface } from '@/types/court'

interface Props {
  params: Promise<{ id: string }>
}

const FACILITY_LABELS: Record<string, string> = {
  dedicated_court: 'Dedicated Court',
  gym: 'Gym / Fitness Centre',
  community_centre: 'Community Centre',
}

const SURFACE_LABELS: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  both: 'Indoor & Outdoor',
}

const SURFACE_STYLES: Record<string, string> = {
  indoor: 'bg-orange-50 text-orange-600',
  outdoor: 'bg-sky-50 text-sky-600',
  both: 'bg-violet-50 text-violet-600',
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export default async function CourtDetailPage({ params }: Props) {
  const { id } = await params
  const court = await prisma.court.findUnique({ where: { id } })

  if (!court) notFound()

  const hours = court.openingHours as Record<string, string> | null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="text-white font-bold text-xl tracking-tight">
              CourtLookup
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BackButton />

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {FACILITY_LABELS[court.facilityType] ?? court.facilityType}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${SURFACE_STYLES[court.surface] ?? 'bg-slate-100 text-slate-600'}`}>
                {SURFACE_LABELS[court.surface] ?? court.surface}
              </span>
              <FlagSurfaceButton
                courtId={court.id}
                currentSurface={court.surface as Surface}
                align="left"
                direction="down"
                label="Report incorrect"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{court.name}</h1>
            <p className="text-slate-500 mt-1">{court.address}</p>
          </div>

          {/* Details grid */}
          <div className="p-6 grid sm:grid-cols-2 gap-6">
            {/* Location */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Location</h2>
              <p className="text-slate-700">{court.suburb}, {court.state} {court.postcode}</p>
            </div>

            {/* Court count */}
            {court.courtCount && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Courts</h2>
                <p className="text-slate-700">{court.courtCount} court{court.courtCount !== 1 ? 's' : ''}</p>
              </div>
            )}

            {/* Phone */}
            {court.phone && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Phone</h2>
                <a href={`tel:${court.phone}`} className="text-orange-600 hover:text-orange-500 transition-colors">
                  {court.phone}
                </a>
              </div>
            )}

            {/* Verified */}
            {court.verifiedAt && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Last verified</h2>
                <p className="text-slate-700">
                  {new Date(court.verifiedAt).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Opening hours */}
          {hours && Object.keys(hours).length > 0 && (
            <div className="px-6 pb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Opening Hours</h2>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                {Object.entries(hours).map(([day, time]) => (
                  <div key={day} className="contents">
                    <span className="text-slate-500">{DAY_LABELS[day] ?? day}</span>
                    <span className="text-slate-700">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            {court.bookingUrl && (
              <a
                href={court.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
              >
                Book Now →
              </a>
            )}
            {court.websiteUrl && (
              <a
                href={court.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-6 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Visit Website
              </a>
            )}
            {!court.bookingUrl && !court.websiteUrl && (
              <p className="text-slate-400 text-sm">No booking link available for this venue.</p>
            )}
          </div>
        </div>

        {/* Map embed placeholder */}
        <div className="mt-6 bg-slate-200 rounded-2xl h-48 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Map coming in Phase 2</p>
        </div>
      </main>
    </div>
  )
}
