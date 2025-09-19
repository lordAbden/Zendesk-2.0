'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import SettingsForm from '@/components/SettingsForm'

export default function Settings() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        )
    }

    if (!user) {
        return null
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paramètres du Compte</h1>
                    <p className="text-gray-600 mt-1">Gérez vos informations de compte et préférences</p>
                </div>
                <SettingsForm />
            </div>
        </DashboardLayout>
    )
}
