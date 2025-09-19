'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import EmployeeDashboard from '@/components/EmployeeDashboard'
import TechnicianDashboard from '@/components/TechnicianDashboard'
import AdminDashboard from '@/components/AdminDashboard'

export default function Dashboard() {
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
            {user.role === 'admin' ? (
                <AdminDashboard />
            ) : user.role === 'technician' ? (
                <TechnicianDashboard />
            ) : (
                <EmployeeDashboard />
            )}
        </DashboardLayout>
    )
} 