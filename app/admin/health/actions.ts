'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function acknowledgeHealth(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  await prisma.urlHealth.delete({ where: { courtId } })
  revalidatePath('/admin/health')
}

export async function clearBookingUrl(formData: FormData) {
  const courtId = formData.get('courtId')
  if (typeof courtId !== 'string') throw new Error('Missing courtId')

  await prisma.$transaction([
    prisma.court.update({ where: { id: courtId }, data: { bookingUrl: null } }),
    prisma.urlHealth.delete({ where: { courtId } }),
  ])

  revalidatePath('/admin/health')
  revalidatePath(`/courts/${courtId}`)
}
