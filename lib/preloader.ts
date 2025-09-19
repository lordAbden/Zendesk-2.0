// Utility functions for managing preloader state
// These can be used throughout the application to show/hide the preloader

export const preloaderActions = {
    show: () => {
        // This will be used by components that need to show the preloader
        // The actual implementation is handled by the PreloaderContext
        console.log('Preloader should be shown')
    },

    hide: () => {
        // This will be used by components that need to hide the preloader
        // The actual implementation is handled by the PreloaderContext
        console.log('Preloader should be hidden')
    }
}

// You can extend this with more specific preloader actions
export const preloaderConfig = {
    defaultDuration: 3000, // 3 seconds
    minDuration: 1000,     // Minimum 1 second
    maxDuration: 10000,    // Maximum 10 seconds
}
