import { config } from 'dotenv'

config({ path: '.env.local' })

async function main() {
  const { checkAllBookingUrls } = await import('../lib/check-booking-urls')
  const { prisma } = await import('../lib/prisma')

  try {
    const summary = await checkAllBookingUrls({ log: true })
    console.log()
    console.log(`Done in ${(summary.durationMs / 1000).toFixed(1)}s`)
    console.log(`  OK:      ${summary.ok}`)
    console.log(`  Broken:  ${summary.broken}`)
    console.log(`  Errors:  ${summary.errors}`)
    console.log(`  Total:   ${summary.total}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
