'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface PreloaderContextType {
    isLoading: boolean
    setLoading: (loading: boolean) => void
    showPreloader: () => void
    hidePreloader: () => void
}

const PreloaderContext = createContext<PreloaderContextType | undefined>(undefined)

export function PreloaderProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)

    const setLoading = (loading: boolean) => {
        setIsLoading(loading)
    }

    const showPreloader = () => {
        setIsLoading(true)
    }

    const hidePreloader = () => {
        setIsLoading(false)
    }

    return (
        <PreloaderContext.Provider value={{
            isLoading,
            setLoading,
            showPreloader,
            hidePreloader
        }}>
            {children}
        </PreloaderContext.Provider>
    )
}

export function usePreloader() {
    const context = useContext(PreloaderContext)
    if (context === undefined) {
        throw new Error('usePreloader must be used within a PreloaderProvider')
    }
    return context
}
