'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Ticket, Plus, Clock, CheckCircle, Bell, UserCheck, RotateCcw, FileText } from 'lucide-react'
import Link from 'next/link'
import { useNotifications } from '@/contexts/NotificationContext'

interface DashboardStats {
    opened_tickets: number
    unassigned_tickets: number
    in_progress_tickets: number
    closed_tickets: number
    reopened_tickets: number
    total_tickets: number
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

export default function EmployeeDashboard() {
    const router = useRouter()
    const { user } = useAuth()
    const { addNotification } = useNotifications()

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/api/auth/dashboard/')
            return response.data
        }
    })

    const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const response = await api.get('/api/auth/recent-activity/?limit=5')
            return response.data || []
        }
    })

    const getActivityDescription = (activity: RecentActivity) => {
        switch (activity.event_type) {
            case 'claimed':
                return `${activity.actor.first_name} ${activity.actor.last_name} a réclamé le ticket`
            case 'closed':
                return `${activity.actor.first_name} ${activity.actor.last_name} a fermé le ticket`
            case 'reopened':
                return `${activity.actor.first_name} ${activity.actor.last_name} a rouvert le ticket`
            case 'status_changed':
                if (activity.from_value && activity.to_value) {
                    return `${activity.actor.first_name} ${activity.actor.last_name} a changé le statut de "${activity.from_value}" à "${activity.to_value}"`
                }
                return `${activity.actor.first_name} ${activity.actor.last_name} a changé le statut du ticket`
            case 'created':
                return `${activity.actor.first_name} ${activity.actor.last_name} a créé le ticket`
            case 'assigned':
                return `${activity.actor.first_name} ${activity.actor.last_name} a assigné le ticket`
            case 'updated':
                return `${activity.actor.first_name} ${activity.actor.last_name} a mis à jour le ticket`
            default:
                return `${activity.actor.first_name} ${activity.actor.last_name} a effectué une action sur le ticket`
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
            case 'created':
                return Ticket
            case 'assigned':
                return UserCheck
            case 'updated':
                return FileText
            default:
                return FileText
        }
    }

    const dashboardCards = [
        {
            title: 'Tickets Non Assignés',
            count: stats?.unassigned_tickets || 0,
            icon: Clock,
            href: '/tickets?mine=true&status=open&assigned=none',
            colorClass: 'apple-card-unassigned',
            description: 'En attente d\'assignation'
        },
        {
            title: 'Tickets En Cours',
            count: stats?.in_progress_tickets || 0,
            icon: Ticket,
            href: '/tickets?mine=true&status=in_progress',
            colorClass: 'apple-card-in-progress',
            description: 'Actuellement traités'
        },
        {
            title: 'Tickets Fermés',
            count: stats?.closed_tickets || 0,
            icon: CheckCircle,
            href: '/tickets?mine=true&status=closed',
            colorClass: 'apple-card-closed',
            description: 'Résolus avec succès'
        },
        {
            title: 'Tickets Rouverts',
            count: stats?.reopened_tickets || 0,
            icon: RotateCcw,
            href: '/tickets?mine=true&status=reopened',
            colorClass: 'apple-card-reopened',
            description: 'Nécessitent une attention'
        },
        {
            title: 'Total des Tickets',
            count: stats?.total_tickets || 0,
            icon: Ticket,
            href: '/tickets?mine=true',
            colorClass: 'apple-card-total',
            description: 'Tous vos tickets'
        }
    ]

    if (isLoading) {
        return (
            <div className="apple-dashboard-container p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200/60 rounded-2xl w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                        {[1, 2, 3, 4, 5].map((i) => (
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
                <h1 className="apple-dashboard-title">
                    {user?.first_name && user?.last_name
                        ? `Tableau de Bord de ${user.first_name} ${user.last_name}`
                        : 'Tableau de Bord Employé'
                    }
                </h1>
                <p className="apple-dashboard-subtitle">
                    Vue d'ensemble de vos tickets et activités récentes
                </p>
            </div>

            {/* Stats Cards - Apple-inspired Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
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
                                    <p className="text-xs text-gray-500/70 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Quick Actions - Apple Style */}
            <div className="apple-card p-6">
                <h2 className="apple-dashboard-title text-xl mb-6">Actions Rapides</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push('/tickets/new')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-gray-200/60 rounded-2xl hover:border-blue-400/60 hover:bg-blue-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100/80 flex items-center justify-center group-hover:bg-blue-200/80 transition-colors">
                                <Plus className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-blue-700 transition-colors">
                                Créer un Nouveau Ticket
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/tickets')}
                        className="group flex items-center justify-center p-6 border-2 border-dashed border-gray-200/60 rounded-2xl hover:border-purple-400/60 hover:bg-purple-50/30 transition-all duration-300 ease-out hover:scale-[1.02]"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100/80 flex items-center justify-center group-hover:bg-purple-200/80 transition-colors">
                                <Ticket className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-purple-700 transition-colors">
                                Voir Tous les Tickets
                            </span>
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
                                        <p className="text-sm font-semibold text-gray-900 mb-1">
                                            {activity.ticket_short_id} - {activity.ticket_subject}
                                        </p>
                                        <p className="text-xs text-gray-600/80 mb-2 leading-relaxed">
                                            {getActivityDescription(activity)}
                                        </p>
                                        <p className="text-xs text-gray-500/70">
                                            {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <Ticket className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>Aucune activité récente</p>
                        <p className="text-sm">Vos mises à jour de tickets apparaîtront ici</p>
                    </div>
                )}
            </div>
        </div>
    )
} 