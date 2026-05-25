import { prisma } from '@/lib/prisma'

const USER_AGENT =
  'Mozilla/5.0 (compatible; CourtLookupBot/1.0; +https://courtlookup.app/about)'
const REQUEST_TIMEOUT_MS = 10000
const DELAY_BETWEEN_REQUESTS_MS = 2000

export type CheckResult = {
  courtId: string
  url: string
  status: number
  errorMsg: string | null
}

export type CheckSummary = {
  total: number
  ok: number
  broken: number
  errors: number
  durationMs: number
}

async function checkOne(url: string): Promise<{ status: number; errorMsg: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const init: RequestInit = {
    headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    redirect: 'follow',
    signal: controller.signal,
  }

  try {
    let res = await fetch(url, { ...init, method: 'HEAD' })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { ...init, method: 'GET' })
    }
    return { status: res.status, errorMsg: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { status: -1, errorMsg: msg.slice(0, 200) }
  } finally {
    clearTimeout(timeout)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function checkAllBookingUrls(opts?: { log?: boolean }): Promise<CheckSummary> {
  const log = opts?.log ?? false
  const started = Date.now()

  const courts = await prisma.court.findMany({
    where: { bookingUrl: { not: null }, hiddenAt: null },
    select: { id: true, name: true, bookingUrl: true },
    orderBy: { name: 'asc' },
  })

  if (log) console.log(`Checking ${courts.length} booking URLs`)

  let ok = 0
  let broken = 0
  let errors = 0

  for (let i = 0; i < courts.length; i++) {
    const c = courts[i]
    const url = c.bookingUrl!
    const result = await checkOne(url)

    if (result.status === 200) ok++
    else if (result.status === -1) errors++
    else broken++

    await prisma.urlHealth.upsert({
      where: { courtId: c.id },
      create: {
        courtId: c.id,
        url,
        status: result.status,
        errorMsg: result.errorMsg,
      },
      update: {
        url,
        status: result.status,
        errorMsg: result.errorMsg,
        checkedAt: new Date(),
      },
    })

    if (log) {
      const tag = result.status === 200 ? 'OK ' : result.status === -1 ? 'ERR' : 'BAD'
      const detail = result.status === -1 ? result.errorMsg : String(result.status)
      console.log(`  [${i + 1}/${courts.length}] ${tag} ${detail} · ${c.name}`)
    }

    if (i < courts.length - 1) await sleep(DELAY_BETWEEN_REQUESTS_MS)
  }

  return {
    total: courts.length,
    ok,
    broken,
    errors,
    durationMs: Date.now() - started,
  }
}
