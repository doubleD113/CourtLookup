'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

const VALID_SURFACES = new Set(['indoor', 'outdoor', 'both'])

export async function approveSurfaceFlag(formData: FormData) {
  const courtId = formData.get('courtId')
  const suggestedSurface = formData.get('suggestedSurface')

  if (typeof courtId !== 'string' || typeof suggestedSurface !== 'string') {
    throw new Error('Missing fields')
  }
  if (!VALID_SURFACES.has(suggestedSurface)) {
    throw new Error('Invalid surface')
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.court.update({
      where: { id: courtId },
      data: { surface: suggestedSurface, surfaceVerifiedAt: now, verifiedAt: now },
    }),
    prisma.courtFlag.deleteMany({ where: { courtId, kind: 'surface' } }),
  ])

  revalidatePath('/admin/flags')
  revalidatePath(`/courts/${courtId}`)
}

export async function hideCourt(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  await prisma.$transaction([
    prisma.court.update({
      where: { id: courtId },
      data: { hiddenAt: new Date() },
    }),
    prisma.courtFlag.deleteMany({ where: { courtId } }),
  ])

  revalidatePath('/admin/flags')
  revalidatePath(`/courts/${courtId}`)
}

export async function confirmCourtExists(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  const now = new Date()
  await prisma.$transaction([
    prisma.court.update({
      where: { id: courtId },
      data: { verifiedAt: now },
    }),
    prisma.courtFlag.deleteMany({ where: { courtId, kind: 'court_existence' } }),
  ])

  revalidatePath('/admin/flags')
  revalidatePath(`/courts/${courtId}`)
}

export async function dismissAllFlags(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  await prisma.courtFlag.deleteMany({ where: { courtId } })
  revalidatePath('/admin/flags')
}

export async function unhideCourt(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  await prisma.court.update({ where: { id: courtId }, data: { hiddenAt: null } })
  revalidatePath('/admin/flags')
  revalidatePath(`/courts/${courtId}`)
}
