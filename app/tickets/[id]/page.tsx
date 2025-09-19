'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import TechnicianTicket from '@/components/TechnicianTicket'
import EmployeeTicket from '@/components/EmployeeTicket'
import AdminTicket from '@/components/AdminTicket'

interface TicketDetailPageProps {
    params: {
        id: string
    }
}

export default function TicketDetailPage({ params }: TicketDetailPageProps) {
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
                <div className="space-y-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="space-y-4">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
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
                <AdminTicket ticketId={params.id} />
            ) : user.role === 'technician' ? (
                <TechnicianTicket ticketId={params.id} />
            ) : (
                <EmployeeTicket ticketId={params.id} />
            )}
        </DashboardLayout>
    )
} 