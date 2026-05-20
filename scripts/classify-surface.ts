import { config } from 'dotenv'

config({ path: '.env.local' })

import type { Surface } from '../types/court'

// Strong outdoor signals: definitively outdoor venues
const STRONG_OUTDOOR_PATTERNS = [
  /\boutdoor\b/i,
  /\bskate\s*park\b/i,
  /\boutdoor\s+gym\b/i,
  /\bhalf[- ]?court\b/i,
  /\bbasketball\s+court$/i,
  /\b(public|street)\s+court\b/i,
  /\btennis\s+courts?\b/i,
  /\boval\b/i,
  /\bplayground\b/i,
  /\bfields?\b/i,
]

// Weak outdoor signals: usually outdoor but can appear in suburb names
const WEAK_OUTDOOR_PATTERNS = [
  /\bpark\b/i,
  /\breserve\b/i,
  /\bgardens?\b/i,
]

// Strong indoor signals: these win over any outdoor signal
const STRONG_INDOOR_PATTERNS = [
  /\bindoor\b/i,
  /\bstadium\b/i,
  /\barena\b/i,
  /\bsport(s)?\s*(centre|center|complex)\b/i,
  /\brecreation\s*(centre|center)\b/i,
  /\bleisure\s*(centre|center)\b/i,
  /\baquatic\s*(centre|center)\b/i,
  /\bcommunity\s*(centre|center)\b/i,
  /\bbasketball\s*(centre|center)\b/i,
  /\bymca\b/i,
  /\bpcyc\b/i,
  /\bschool\b/i,
  /\bcollege\b/i,
  /\buniversity\b/i,
  /\bgymnasium\b/i,
]

// Weak indoor signal: 'gym' alone is ambiguous ('outdoor gym' is a thing)
const WEAK_INDOOR_PATTERNS = [
  /\bgym\b/i,
]

type Classification = {
  surface: Surface
  reason: string
  confident: boolean
}

function classify(name: string, facilityType: string): Classification {
  const strongIndoor = STRONG_INDOOR_PATTERNS.find((re) => re.test(name))
  const strongOutdoor = STRONG_OUTDOOR_PATTERNS.find((re) => re.test(name))
  const weakIndoor = WEAK_INDOOR_PATTERNS.find((re) => re.test(name))
  const weakOutdoor = WEAK_OUTDOOR_PATTERNS.find((re) => re.test(name))

  if (strongIndoor && strongOutdoor) {
    return {
      surface: 'both',
      reason: `strong indoor (${strongIndoor.source}) + strong outdoor (${strongOutdoor.source})`,
      confident: true,
    }
  }

  if (strongOutdoor) {
    return {
      surface: 'outdoor',
      reason: `strong outdoor (${strongOutdoor.source})`,
      confident: true,
    }
  }

  if (strongIndoor) {
    return {
      surface: 'indoor',
      reason: `strong indoor (${strongIndoor.source})${weakOutdoor ? ` (overrode weak outdoor ${weakOutdoor.source})` : ''}`,
      confident: true,
    }
  }

  if (weakOutdoor && weakIndoor) {
    return {
      surface: 'both',
      reason: `weak indoor (${weakIndoor.source}) + weak outdoor (${weakOutdoor.source})`,
      confident: true,
    }
  }

  if (weakOutdoor) {
    return {
      surface: 'outdoor',
      reason: `weak outdoor (${weakOutdoor.source}) only`,
      confident: false,
    }
  }

  if (weakIndoor) {
    return {
      surface: 'indoor',
      reason: `weak indoor (${weakIndoor.source}) only`,
      confident: false,
    }
  }

  if (facilityType === 'gym' || facilityType === 'community_centre') {
    return {
      surface: 'indoor',
      reason: `facilityType=${facilityType} → assume indoor`,
      confident: false,
    }
  }

  return {
    surface: 'indoor',
    reason: 'no signal, kept default',
    confident: false,
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { prisma } = await import('../lib/prisma')

  try {
    const courts = await prisma.court.findMany({
      select: { id: true, name: true, suburb: true, surface: true, facilityType: true },
      orderBy: { name: 'asc' },
    })

    console.log(`${dryRun ? 'DRY RUN — ' : ''}Classifying ${courts.length} courts`)
    console.log()

    const changes: Array<{
      id: string
      name: string
      suburb: string
      from: string
      to: Surface
      reason: string
    }> = []
    const unchanged: Array<{ name: string; surface: string; reason: string }> = []
    const lowConfidence: Array<{ name: string; surface: string; reason: string }> = []

    for (const c of courts) {
      const result = classify(c.name, c.facilityType)
      if (result.surface !== c.surface) {
        changes.push({
          id: c.id,
          name: c.name,
          suburb: c.suburb,
          from: c.surface,
          to: result.surface,
          reason: result.reason,
        })
      } else {
        unchanged.push({ name: c.name, surface: c.surface, reason: result.reason })
      }
      if (!result.confident) {
        lowConfidence.push({ name: c.name, surface: result.surface, reason: result.reason })
      }
    }

    console.log(`Proposed changes: ${changes.length}`)
    console.log(`Unchanged:        ${unchanged.length}`)
    console.log(`Low confidence:   ${lowConfidence.length} (kept current)`)
    console.log()

    if (changes.length > 0) {
      console.log('Changes:')
      for (const ch of changes) {
        console.log(`  ${ch.from.padEnd(7)} → ${ch.to.padEnd(7)} · ${ch.name} (${ch.suburb})`)
        console.log(`    ${ch.reason}`)
      }
      console.log()
    }

    if (dryRun) {
      console.log('Dry run — no DB writes. Re-run without --dry-run to apply.')
      return
    }

    let applied = 0
    for (const ch of changes) {
      await prisma.court.update({
        where: { id: ch.id },
        data: { surface: ch.to },
      })
      applied++
    }
    console.log(`Applied ${applied} updates.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
