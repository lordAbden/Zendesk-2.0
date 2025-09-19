'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Ticket, Plus, Clock, CheckCircle, AlertTriangle, RotateCcw, UserCheck, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardStats {
    unassigned_tickets: number
    total_open_tickets: number
    my_open_tickets: number
    in_progress_tickets: number
    closed_tickets: number
    reopened_tickets: number
    new_tickets_since_login: number
}

interface RecentActivity {
    id: string
    event_type: string
    ticket_id: string
    ticket_short_id: string
    ticket_subject: string
    from_value?: string
    to_value?: string
    created_at: string
    actor: {
        id: string
        first_name: string
        last_name: string
        email: string
    }
}

export default function TechnicianDashboard() {
    const router = useRouter()
    const { user } = useAuth()

    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/api/auth/dashboard/')
            return response.data
        },
        staleTime: 0, // Always consider data stale to ensure fresh data
        refetchOnMount: true, // Refetch when component mounts
    })

    const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const response = await api.get('/api/auth/recent-activity/?limit=5')
            return response.data
        }
    })

    const getActivityDescription = (activity: RecentActivity) => {
        switch (activity.event_type) {
            case 'claimed':
                return `Vous avez réclamé le ticket`
            case 'closed':
                return `Vous avez fermé le ticket`
            case 'reopened':
                return `Vous avez rouvert le ticket`
            case 'status_changed':
                if (activity.from_value && activity.to_value) {
                    return `Vous avez changé le statut de "${activity.from_value}" à "${activity.to_value}"`
                }
                return `Vous avez changé le statut du ticket`
            default:
                return `Vous avez effectué une action sur le ticket`
        }
    }

    const getActivityIcon = (eventType: string) => {
        switch (eventType) {
            case 'claimed':
                return UserCheck
            case 'closed':
                return CheckCircle
            case 'reopened':
                return RotateCcw
            case 'status_changed':
                return FileText
            default:
                return FileText
        }
    }

    const dashboardCards = [
        {
            title: 'Tickets Ouverts',
            count: stats?.total_open_tickets || 0,
            icon: Clock,
            href: '/tickets?status=open',
            colorClass: 'apple-card-in-progress',
            description: 'Tickets disponibles dans le système',
            newSinceLogin: stats?.new_tickets_since_login || 0
        },
        {
            title: 'En Cours',
            count: stats?.in_progress_tickets || 0,
            icon: AlertTriangle,
            href: '/tickets?filter=in_progress',
            colorClass: 'apple-card-unassigned',
            description: 'Tickets en cours de traitement'
        },
        {
            title: 'Tickets Fermés',
            count: stats?.closed_tickets || 0,
            icon: CheckCircle,
            href: '/tickets?filter=closed&assigned=me',
            colorClass: 'apple-card-closed',
            description: 'Récemment terminés'
        },
        {
            title: 'Tickets Rouverts',
            count: stats?.reopened_tickets || 0,
            icon: RotateCcw,
            href: '/tickets?filter=reopened',
            colorClass: 'apple-card-reopened',
            description: 'Tickets rouverts récemment'
        }
    ]

    if (isLoading) {
        return (
            <div className="apple-dashboard-container p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200/60 rounded-2xl w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="apple-card p-6 h-40">
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 bg-gray-200/60 rounded-xl"></div>
                                        <div className="w-5 h-5 bg-gray-200/60 rounded"></div>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-gray-200/60 rounded w-3/4"></div>
                                        <div className="h-8 bg-gray-200/60 rounded w-1/2"></div>
                                        <div className="h-3 bg-gray-200/60 rounded w-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="apple-dashboard-container p-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="apple-dashboard-title">Tableau de Bord Technicien</h1>
                <p className="apple-dashboard-subtitle">
                    Gérer et suivre tous les tickets de support
                </p>
            </div>

            {/* Stats Cards - Apple-inspired Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {dashboardCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="apple-card p-6 cursor-pointer group"
                        >
                            <div className="flex flex-col h-full">
                                {/* Icon and Arrow */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`apple-card-icon ${card.colorClass}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <svg
                                        className="apple-card-arrow"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="apple-card-title mb-2">{card.title}</h3>
                                    <p className="apple-card-number mb-2">{card.count}</p>
                                    <p className="text-xs text-gray-500/70 leading-relaxed mb-2">
                                        {card.description}
                                    </p>
                                    {card.newSinceLogin && card.newSinceLogin > 0 && (
                                        <p className="text-xs text-emerald-600 font-medium flex items-center">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            +{card.newSinceLogin} depuis votre dernière connexion
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Quick Actions - Apple Style */}
            <div className="apple-card p-6">
                <h2 className="apple-dashboard-title text-xl mb-6">Actions Rapides</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => router.push('/tickets?filter=unassigned')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-red-200/60 rounded-2xl hover:border-red-400/60 hover:bg-red-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100/80 flex items-center justify-center group-hover:bg-red-200/80 transition-colors">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="text-left">
                                <span className="text-red-700 font-medium block group-hover:text-red-800 transition-colors">Prendre Non Assignés</span>
                                <span className="text-xs text-red-600/80">Prendre de nouveaux tickets</span>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/tickets?filter=my-open')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-yellow-200/60 rounded-2xl hover:border-yellow-400/60 hover:bg-yellow-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-100/80 flex items-center justify-center group-hover:bg-yellow-200/80 transition-colors">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="text-left">
                                <span className="text-yellow-700 font-medium block group-hover:text-yellow-800 transition-colors">Mes Tickets Actifs</span>
                                <span className="text-xs text-yellow-600/80">Continuer le travail</span>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/tickets')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-blue-200/60 rounded-2xl hover:border-blue-400/60 hover:bg-blue-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center group-hover:bg-blue-200/80 transition-colors">
                                <Ticket className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <span className="text-blue-700 font-medium block group-hover:text-blue-800 transition-colors">Voir Tous les Tickets</span>
                                <span className="text-xs text-blue-600/80">Vue d'ensemble complète</span>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/tickets?filter=reopened')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-orange-200/60 rounded-2xl hover:border-orange-400/60 hover:bg-orange-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100/80 flex items-center justify-center group-hover:bg-orange-200/80 transition-colors">
                                <RotateCcw className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="text-left">
                                <span className="text-orange-700 font-medium block group-hover:text-orange-800 transition-colors">Tickets Rouverts</span>
                                <span className="text-xs text-orange-600/80">Voir les tickets rouverts</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Activity - Apple Style */}
            <div className="apple-card p-6 mt-8">
                <h2 className="apple-dashboard-title text-xl mb-6">Activité Récente</h2>
                {activityLoading ? (
                    <div className="text-center py-6 text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                        <p>Chargement de l'activité récente...</p>
                    </div>
                ) : recentActivity && recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivity.map((activity) => {
                            const Icon = getActivityIcon(activity.event_type)
                            return (
                                <Link
                                    key={activity.id}
                                    href={`/tickets/${activity.ticket_id}`}
                                    className="group flex items-start space-x-4 p-4 bg-white/50 rounded-xl hover:bg-white/80 transition-all duration-300 ease-out hover:scale-[1.01] cursor-pointer border border-white/20"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-blue-100/80 flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-blue-200/80 transition-colors">
                                        <Icon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {activity.ticket_short_id} - {activity.ticket_subject}
                                            </span>
                                            <span className="text-xs text-gray-500/70">
                                                {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600/80 leading-relaxed">
                                            {getActivityDescription(activity)}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500/80">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100/80 flex items-center justify-center mx-auto mb-4">
                            <Ticket className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-700 mb-2">Aucune activité récente</p>
                        <p className="text-sm text-gray-500/70">Vos actions sur les tickets apparaîtront ici</p>
                    </div>
                )}
            </div>
        </div>
    )
} 