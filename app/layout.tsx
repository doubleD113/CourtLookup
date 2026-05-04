import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'CourtLookup — Find Indoor Basketball Courts in Australia',
  description:
    'Australia\'s basketball court directory. Search by suburb or postcode to find indoor courts near you and book directly through their official sites.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
