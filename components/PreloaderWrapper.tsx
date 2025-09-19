'use client'

import { usePreloader } from '@/contexts/PreloaderContext'
import Preloader from './Preloader'

interface PreloaderWrapperProps {
    children: React.ReactNode
}

export default function PreloaderWrapper({ children }: PreloaderWrapperProps) {
    const { isLoading, hidePreloader } = usePreloader()

    return (
        <>
            {isLoading && (
                <Preloader
                    onComplete={hidePreloader}
                    duration={3000}
                    showProgress={true}
                    showDots={false}
                    customText="Chargement en cours..."
                    customSubtext=""
                />
            )}
            {children}
        </>
    )
}
