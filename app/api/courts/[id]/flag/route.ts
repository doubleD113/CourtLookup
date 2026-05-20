import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

const VALID_SURFACES = new Set(['indoor', 'outdoor', 'both'])

function hashIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: { suggestedSurface?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const suggestedSurface = body.suggestedSurface
  if (!suggestedSurface || !VALID_SURFACES.has(suggestedSurface)) {
    return NextResponse.json(
      { error: 'suggestedSurface must be indoor, outdoor, or both' },
      { status: 400 },
    )
  }

  const court = await prisma.court.findUnique({ where: { id }, select: { id: true } })
  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const ipHash = hashIp(req)

  await prisma.courtFlag.upsert({
    where: { courtId_ipHash: { courtId: id, ipHash } },
    create: { courtId: id, ipHash, suggestedSurface },
    update: { suggestedSurface, createdAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
