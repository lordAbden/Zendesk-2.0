'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
    Users,
    Ticket,
    Clock,
    CheckCircle,
    UserCheck,
    RotateCcw,
    FileText
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
    total_users: number
    total_tickets: number
    open_tickets: number
    closed_tickets: number
    users_by_role: {
        admin: number
        employee: number
        technician: number
    }
    tickets_by_priority: {
        P1: number
        P2: number
        P3: number
        P4: number
    }
    tickets_by_type: {
        Network: number
        Hardware: number
        Software: number
    }
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

export default function AdminDashboard() {
    const { user } = useAuth()
    const router = useRouter()

    // Fetch dashboard statistics
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['admin-dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/api/auth/admin/dashboard-stats/')
            return response.data
        },
        enabled: user?.role === 'admin'
    })

    // Fetch recent users
    const { data: recentUsers } = useQuery({
        queryKey: ['recent-users'],
        queryFn: async () => {
            const response = await api.get('/api/auth/users/?limit=5')
            return response.data.results || response.data
        },
        enabled: user?.role === 'admin'
    })

    // Fetch recent activity
    const { data: recentActivity } = useQuery<RecentActivity[]>({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const response = await api.get('/api/auth/recent-activity/?limit=5')
            return response.data || []
        },
        enabled: user?.role === 'admin'
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

    if (isLoading) {
        return (
            <div className="apple-dashboard-container p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200/60 rounded-2xl w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="apple-card p-6 h-32">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gray-200/60 rounded-xl mr-4"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200/60 rounded w-3/4 mb-2"></div>
                                        <div className="h-8 bg-gray-200/60 rounded w-1/2"></div>
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
                <h1 className="apple-dashboard-title">Tableau de Bord Administrateur</h1>
                <p className="apple-dashboard-subtitle">
                    Vue d'ensemble du système et gestion des utilisateurs
                </p>
            </div>



            {/* Main Statistics Cards - Apple Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="apple-card p-6 group">
                    <div className="flex items-center">
                        <div className="apple-card-icon apple-card-in-progress mr-4">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="apple-card-title">Total Utilisateurs</p>
                            <p className="apple-card-number">{stats?.total_users || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Total Tickets */}
                <div className="apple-card p-6 group">
                    <div className="flex items-center">
                        <div className="apple-card-icon apple-card-total mr-4">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="apple-card-title">Total Tickets</p>
                            <p className="apple-card-number">{stats?.total_tickets || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Open Tickets */}
                <div className="apple-card p-6 group">
                    <div className="flex items-center">
                        <div className="apple-card-icon apple-card-unassigned mr-4">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="apple-card-title">Tickets Ouverts</p>
                            <p className="apple-card-number text-orange-600">{stats?.open_tickets || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Closed Tickets */}
                <div className="apple-card p-6 group">
                    <div className="flex items-center">
                        <div className="apple-card-icon apple-card-closed mr-4">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="apple-card-title">Tickets Fermés</p>
                            <p className="apple-card-number text-emerald-600">{stats?.closed_tickets || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Statistics - Apple Design */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Users by Role */}
                <div className="apple-card p-6">
                    <h2 className="apple-dashboard-title text-xl mb-6">Utilisateurs par Rôle</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm font-medium text-gray-700">Administrateur</span>
                            </div>
                            <span className="apple-card-number text-lg">{stats?.users_by_role?.admin || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium text-gray-700">Employé</span>
                            </div>
                            <span className="apple-card-number text-lg">{stats?.users_by_role?.employee || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-gray-700">Technicien</span>
                            </div>
                            <span className="apple-card-number text-lg">{stats?.users_by_role?.technician || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Tickets by Priority */}
                <div className="apple-card p-6">
                    <h2 className="apple-dashboard-title text-xl mb-6">Tickets par Priorité</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm font-medium text-gray-700">P1 - Plus Haute</span>
                            </div>
                            <span className="apple-card-number text-lg text-red-600">{stats?.tickets_by_priority?.P1 || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-sm font-medium text-gray-700">P2 - Haute</span>
                            </div>
                            <span className="apple-card-number text-lg text-orange-600">{stats?.tickets_by_priority?.P2 || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-sm font-medium text-gray-700">P3 - Moyenne</span>
                            </div>
                            <span className="apple-card-number text-lg text-yellow-600">{stats?.tickets_by_priority?.P3 || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-gray-700">P4 - Faible</span>
                            </div>
                            <span className="apple-card-number text-lg text-green-600">{stats?.tickets_by_priority?.P4 || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity - Apple Design */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="apple-card p-6">
                    <h2 className="apple-dashboard-title text-xl mb-6">Utilisateurs Récents</h2>
                    {recentUsers && recentUsers.length > 0 ? (
                        <div className="space-y-3">
                            {recentUsers.map((user: any) => (
                                <div key={user.id} className="group flex items-center justify-between p-4 bg-white/50 rounded-xl hover:bg-white/80 transition-all duration-300 ease-out hover:scale-[1.01] border border-white/20">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-100/80 flex items-center justify-center group-hover:bg-blue-200/80 transition-colors">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500/70">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-100/80 text-red-700' :
                                            user.role === 'technician' ? 'bg-green-100/80 text-green-700' :
                                                'bg-blue-100/80 text-blue-700'
                                            }`}>
                                            {user.role === 'admin' ? 'Administrateur' :
                                                user.role === 'technician' ? 'Technicien' : 'Employé'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500/80">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100/80 flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-700 mb-2">Aucun utilisateur trouvé</p>
                            <p className="text-sm text-gray-500/70">Les nouveaux utilisateurs apparaîtront ici</p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="apple-card p-6">
                    <h2 className="apple-dashboard-title text-xl mb-6">Activité Récente</h2>
                    {recentActivity && recentActivity.length > 0 ? (
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
                        <div className="text-center py-12 text-gray-500/80">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100/80 flex items-center justify-center mx-auto mb-4">
                                <Ticket className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-700 mb-2">Aucune activité récente</p>
                            <p className="text-sm text-gray-500/70">L'activité du système apparaîtra ici</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
