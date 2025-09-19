'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { PreloaderProvider } from '@/contexts/PreloaderContext'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                retry: 1,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <PreloaderProvider>
                <AuthProvider>
                    <NotificationProvider>
                        {children}
                    </NotificationProvider>
                </AuthProvider>
            </PreloaderProvider>
        </QueryClientProvider>
    )
} 