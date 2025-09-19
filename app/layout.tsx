import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import PreloaderWrapper from '@/components/PreloaderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'IT Ticketing System',
    description: 'Professional IT support ticketing system',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    <PreloaderWrapper>
                        {children}
                    </PreloaderWrapper>
                </Providers>
            </body>
        </html>
    )
} 