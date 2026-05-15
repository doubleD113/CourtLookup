import Link from 'next/link'
import { Court } from '@/types/court'

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

interface Props {
  court: Court & { distanceKm?: number }
}

export default function CourtCard({ court }: Props) {
  return (
    <Link
      href={`/courts/${court.id}`}
      className="block bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-base truncate">{court.name}</h3>
          <p className="text-slate-500 text-sm mt-0.5 truncate">{court.address}</p>
        </div>
        {court.distanceKm !== undefined && (
          <span className="text-xs text-slate-400 shrink-0 mt-1">
            {court.distanceKm < 1
              ? `${Math.round(court.distanceKm * 1000)} m`
              : `${court.distanceKm.toFixed(1)} km`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {FACILITY_LABELS[court.facilityType] ?? court.facilityType}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${SURFACE_STYLES[court.surface] ?? 'bg-slate-100 text-slate-600'}`}>
          {SURFACE_LABELS[court.surface] ?? court.surface}
        </span>
        {court.courtCount && (
          <span className="text-xs text-slate-400">{court.courtCount} courts</span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3">
        {court.bookingUrl ? (
          <span className="text-xs text-green-600 font-medium">Booking available</span>
        ) : (
          <span className="text-xs text-slate-400">No booking link</span>
        )}
        {court.verifiedAt && (
          <span className="text-xs text-slate-400">
            Verified {new Date(court.verifiedAt).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </Link>
  )
}
