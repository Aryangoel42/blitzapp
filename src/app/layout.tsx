import './globals.css';
import type { Metadata } from 'next';
import { clsx } from 'clsx';
import { FloatingQuickAdd } from '@/components/FloatingQuickAdd';
import { FocusMiniTimer } from '@/components/FocusMiniTimer';
import { AccessibilityProvider } from '@/components/AccessibilityProvider';
import { AccessibilityHelp } from '@/components/AccessibilityHelp';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PWAInitializer } from '@/components/PWAInitializer';

export const metadata: Metadata = {
  title: 'BlitzitApp - Focus Timer & Task Manager',
  description: 'A comprehensive focus timer, task manager, and productivity app with offline support',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BlitzitApp'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="BlitzitApp" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BlitzitApp" />
        <meta name="description" content="A comprehensive focus timer, task manager, and productivity app with offline support" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3B82F6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3B82F6" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://blitzitapp.com" />
        <meta name="twitter:title" content="BlitzitApp" />
        <meta name="twitter:description" content="A comprehensive focus timer, task manager, and productivity app with offline support" />
        <meta name="twitter:image" content="https://blitzitapp.com/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@blitzitapp" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BlitzitApp" />
        <meta property="og:description" content="A comprehensive focus timer, task manager, and productivity app with offline support" />
        <meta property="og:site_name" content="BlitzitApp" />
        <meta property="og:url" content="https://blitzitapp.com" />
        <meta property="og:image" content="https://blitzitapp.com/icons/icon-192x192.png" />
      </head>
      <body className={clsx('min-h-screen bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-50')}>
        <PWAInitializer />
        <ErrorBoundary>
          <AccessibilityProvider>
            {/* Skip to main content link for screen readers */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              Skip to main content
            </a>

          <header role="banner" className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-6 w-6 rounded bg-brand-500" aria-hidden="true" />
                <span className="text-lg font-semibold">BlitzitApp</span>
              </div>
              <nav role="navigation" aria-label="Main navigation" className="flex items-center gap-3 text-sm">
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/today">Today</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/upcoming">Upcoming</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/overdue">Overdue</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/completed">Completed</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/focus">Focus</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/analytics">Analytics</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/forest">Forest</a>
                <a className="hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:rounded px-1" href="/settings">Settings</a>
              </nav>
            </div>
          </header>
          
          <main id="main-content" role="main" className="mx-auto max-w-6xl px-4 py-6" tabIndex={-1}>
            {children}
          </main>
          
          {/* Global floating components */}
          <FloatingQuickAdd userId="demo-user" />
          <FocusMiniTimer userId="demo-user" />
          <AccessibilityHelp />
          </AccessibilityProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}


