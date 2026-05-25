import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { sendDiscordNotification } from '@/lib/discord'

const VALID_SURFACES = new Set(['indoor', 'outdoor', 'both'])
const VALID_KINDS = new Set(['surface', 'court_existence'])

function hashIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

interface FlagBody {
  kind?: string
  payload?: unknown
}

function validatePayload(kind: string, payload: unknown): { ok: true; payload: object } | { ok: false; error: string } {
  if (kind === 'surface') {
    const p = payload as { surface?: string } | null
    if (!p || typeof p.surface !== 'string' || !VALID_SURFACES.has(p.surface)) {
      return { ok: false, error: 'payload.surface must be indoor, outdoor, or both' }
    }
    return { ok: true, payload: { surface: p.surface } }
  }
  if (kind === 'court_existence') {
    const p = payload as { hasCourt?: unknown } | null
    if (!p || typeof p.hasCourt !== 'boolean') {
      return { ok: false, error: 'payload.hasCourt must be boolean' }
    }
    return { ok: true, payload: { hasCourt: p.hasCourt } }
  }
  return { ok: false, error: 'Unknown kind' }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: FlagBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const kind = body.kind
  if (!kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: 'kind must be surface or court_existence' }, { status: 400 })
  }

  const validated = validatePayload(kind, body.payload)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const court = await prisma.court.findUnique({
    where: { id },
    select: { id: true, name: true, suburb: true, state: true },
  })
  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const ipHash = hashIp(req)

  await prisma.courtFlag.upsert({
    where: { courtId_kind_ipHash: { courtId: id, kind, ipHash } },
    create: { courtId: id, kind, ipHash, payload: validated.payload },
    update: { payload: validated.payload, createdAt: new Date() },
  })

  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const reviewUrl = `${origin}/admin/flags`
  const courtUrl = `${origin}/courts/${id}`
  const isExistence = kind === 'court_existence'
  const payloadSummary = isExistence
    ? (validated.payload as { hasCourt: boolean }).hasCourt
      ? 'Reporter says court DOES exist'
      : 'Reporter says court does NOT exist'
    : `Suggested surface: ${(validated.payload as { surface: string }).surface}`

  sendDiscordNotification({
    title: `New ${isExistence ? 'court-existence' : 'surface'} report`,
    description: `**[${court.name}](${courtUrl})**\n${court.suburb}, ${court.state}`,
    color: isExistence ? 0xef4444 : 0xf97316,
    fields: [
      { name: 'Report', value: payloadSummary },
      { name: 'Review', value: `[Open admin queue](${reviewUrl})` },
    ],
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
