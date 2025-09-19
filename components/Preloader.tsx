'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PreloaderProps {
    onComplete?: () => void
    duration?: number
    showProgress?: boolean
    showDots?: boolean
    customText?: string
    customSubtext?: string
}

export default function Preloader({
    onComplete,
    duration = 1500,
    showProgress = true,
    showDots = true,
    customText = "Chargement en cours...",
    customSubtext = "Veuillez patienter pendant que nous préparons votre espace de travail"
}: PreloaderProps) {
    const [progress, setProgress] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prevProgress) => {
                if (prevProgress >= 100) {
                    clearInterval(interval)
                    // Add a small delay before hiding the preloader
                    setTimeout(() => {
                        setIsVisible(false)
                        onComplete?.()
                    }, 200)
                    return 100
                }
                return prevProgress + 4
            })
        }, duration / 50) // Update every 60ms for smooth animation

        return () => clearInterval(interval)
    }, [duration, onComplete])

    if (!isVisible) {
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center space-y-8">
                {/* Logo Image */}
                <div className="relative w-64 h-32 md:w-80 md:h-40">
                    <Image
                        src="/preloader.jpeg"
                        alt="Caisse Marocaine des Retraites"
                        fill
                        className="object-contain"
                        priority
                        sizes="(max-width: 768px) 256px, 320px"
                    />
                </div>

                {/* Loading Text */}
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">
                        {customText}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {customSubtext}
                    </p>
                </div>

                {/* Progress Bar */}
                {showProgress && (
                    <div className="w-80 max-w-sm">
                        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Loading Dots Animation */}
                {showDots && (
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                )}
            </div>
        </div>
    )
}
