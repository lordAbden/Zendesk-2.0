'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePreloader } from '@/contexts/PreloaderContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
    const { user, isLoading } = useAuth()
    const { hidePreloader } = usePreloader()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading) {
            // Hide preloader when auth is loaded
            hidePreloader()

            if (user) {
                router.push('/dashboard')
            } else {
                router.push('/login')
            }
        }
    }, [user, isLoading, router, hidePreloader])

    // The preloader will be shown by PreloaderWrapper
    return null
} 