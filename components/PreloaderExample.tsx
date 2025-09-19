'use client'

import { usePreloader } from '@/contexts/PreloaderContext'

// Example component showing how to use the preloader programmatically
export default function PreloaderExample() {
    const { showPreloader, hidePreloader } = usePreloader()

    const handleShowPreloader = () => {
        showPreloader()
        // Simulate some async operation
        setTimeout(() => {
            hidePreloader()
        }, 3000)
    }

    return (
        <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Preloader Controls</h3>
            <button
                onClick={handleShowPreloader}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
                Show Preloader (3s)
            </button>
        </div>
    )
}
