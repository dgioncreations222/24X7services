import type { Metadata, Viewport } from 'next'
import { BRAND } from '@/lib/brand'
import { COLORS } from '@/lib/theme'
import { StoreProvider } from '@/lib/store'
import { AppShell } from '@/components/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${BRAND.admin} Console`,
    template: `%s · ${BRAND.admin}`,
  },
  description: 'Run the appliance service network — bookings, dispatch, customers, technicians, payments and support.',
  applicationName: `${BRAND.admin} Console`,
  icons: { icon: '/favicon.png' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: COLORS.brandInk,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  )
}
