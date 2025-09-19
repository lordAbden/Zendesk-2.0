import axios from 'axios'

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem('refresh_token')
                if (refreshToken) {
                    const response = await axios.post(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/token/refresh/`,
                        { refresh: refreshToken }
                    )

                    const { access } = response.data
                    localStorage.setItem('access_token', access)
                    api.defaults.headers.common['Authorization'] = `Bearer ${access}`

                    originalRequest.headers.Authorization = `Bearer ${access}`
                    return api(originalRequest)
                }
            } catch (refreshError) {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    }
) 