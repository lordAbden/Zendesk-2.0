'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import {
    Search,
    Filter,
    Plus,
    Eye,
    CheckCircle,
    Clock,
    AlertTriangle,
    Paperclip,
    User,
    Calendar,
    ChevronDown,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X,
    ArrowUpDown
} from 'lucide-react'
import { format } from 'date-fns'

interface Ticket {
    id: string
    short_id: string
    subject: string
    type: string
    state: string
    status: string
    priority: string
    requester: {
        id: string
        first_name: string
        last_name: string
        email: string
        group: string
    }
    assigned_to?: {
        id: string
        first_name: string
        last_name: string
    }
    created_at: string
    updated_at: string
    attachments: Array<{
        id: string
        file_name: string
    }>
}

interface FilterState {
    status: string
    group: string
    priority: string
    time: string
}

// Component that uses useSearchParams - needs to be wrapped in Suspense
function TicketsPageContent() {
    const { user } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState<FilterState>({
        status: '',
        group: '',
        priority: '',
        time: ''
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)

    // Get filter from URL params
    useEffect(() => {
        const filter = searchParams.get('filter')
        const mine = searchParams.get('mine')
        const status = searchParams.get('status')
        const assigned = searchParams.get('assigned')

        if (filter) {
            setFilters(prev => ({ ...prev, status: filter }))
        } else if (mine) {
            setFilters(prev => ({ ...prev, status: 'mine' }))
        }
    }, [searchParams])

    // Build API query parameters
    const buildQueryParams = useMemo(() => {
        const params = new URLSearchParams()

        if (searchTerm) params.append('search', searchTerm)
        params.append('page', currentPage.toString())

        // Apply filters - same logic for all roles
        if (filters.status) {
            if (filters.status === 'reopened') {
                params.append('filter', 'reopened')
            } else {
                params.append('status', filters.status)
            }
        }

        if (filters.priority) {
            params.append('priority', filters.priority)
        }

        if (filters.group) {
            params.append('group', filters.group)
        }

        if (filters.time && filters.time !== '') {
            const now = new Date()
            let startDate: Date

            switch (filters.time) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    break
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    break
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                    break
                default:
                    return params // Don't add created_after for unknown time filters
            }

            params.append('created_after', startDate.toISOString())
        }

        return params
    }, [searchTerm, currentPage, filters])

    const { data: tickets, isLoading, refetch, error } = useQuery({
        queryKey: ['tickets', buildQueryParams.toString()],
        queryFn: async () => {
            const params = buildQueryParams
            console.log('🔍 Fetching tickets with params:', params.toString())
            console.log('🔍 User role:', user?.role)
            console.log('🔍 User ID:', user?.id)

            try {
                const response = await api.get(`/api/tickets/?${params}`)
                console.log('📄 API Response:', {
                    count: response.data.count,
                    results: response.data.results?.length || 0,
                    currentPage,
                    totalPages: Math.ceil(response.data.count / 20),
                    firstTicket: response.data.results?.[0] ? {
                        id: response.data.results[0].id,
                        short_id: response.data.results[0].short_id,
                        subject: response.data.results[0].subject,
                        status: response.data.results[0].status
                    } : null
                })
                return response.data
            } catch (error) {
                console.error('❌ API Error:', error)
                console.error('❌ Error response:', (error as any)?.response?.data)
                throw error
            }
        },
        refetchInterval: 60000, // Refetch every 60 seconds (less frequent)
        staleTime: 30000, // Consider data fresh for 30 seconds
        refetchOnWindowFocus: false, // Don't refetch on window focus
        gcTime: 600000, // Keep data in cache for 10 minutes
        retry: 1, // Retry failed requests once
        retryDelay: 2000 // Wait 2 seconds between retries
    })

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filters])

    // Auto-correct page number if it's beyond the total pages or if current page has no results
    useEffect(() => {
        if (tickets?.count) {
            const totalPages = Math.ceil(tickets.count / 20) // Backend uses PAGE_SIZE: 20
            // Only redirect to page 1 if we're beyond the total pages
            // Don't redirect if current page has no results but is within valid range
            if (currentPage > totalPages) {
                setCurrentPage(1)
            }
        }
    }, [tickets?.count, currentPage])

    const handleTicketClick = (ticketId: string) => {
        router.push(`/tickets/${ticketId}`)
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'P1': return 'bg-red-100 text-red-800 border-red-200'
            case 'P2': return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'P3': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'P4': return 'bg-green-100 text-green-800 border-green-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
            case 'reopened': return 'bg-red-100 text-red-800 border-red-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getStatusDisplayName = (status: string) => {
        switch (status) {
            case 'open': return 'Ouvert'
            case 'in_progress': return 'En cours'
            case 'closed': return 'Fermé'
            case 'reopened': return 'Rouvert'
            default: return status
        }
    }

    const getStateColor = (state: string) => {
        switch (state) {
            case 'New': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    // Custom sorting function for tickets - always applied as default
    const sortTicketsByPriority = (tickets: Ticket[]) => {
        if (!tickets) return []

        return [...tickets].sort((a, b) => {
            // First, sort by status priority: In Progress → New → Closed
            const getStatusPriority = (state: string) => {
                switch (state) {
                    case 'In Progress': return 1
                    case 'New': return 2
                    case 'Closed': return 3
                    default: return 4
                }
            }

            const statusPriorityA = getStatusPriority(a.state)
            const statusPriorityB = getStatusPriority(b.state)

            // If status priority is different, sort by status
            if (statusPriorityA !== statusPriorityB) {
                return statusPriorityA - statusPriorityB
            }

            // If status is the same, sort by creation date (newest first)
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return dateB - dateA
        })
    }

    const getFilterOptions = () => {
        // Same filter options for all roles
        return [
            { value: '', label: 'Tous les Tickets' },
            { value: 'open', label: 'Tickets Ouverts' },
            { value: 'in_progress', label: 'En Cours' },
            { value: 'closed', label: 'Tickets Fermés' },
            { value: 'reopened', label: 'Tickets Rouverts' }
        ]
    }

    const getSortOptions = () => [
        { value: 'created_at', label: 'Date de Création' },
        { value: 'status', label: 'Statut' }
    ]

    return (
        <DashboardLayout>
            <div className="space-y-0">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Tickets
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Gérer et suivre tous les tickets
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {user?.role === 'employee' && (
                                <button
                                    onClick={() => router.push('/tickets/new')}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nouveau Ticket
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher des tickets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors duration-200 ${showFilters || Object.values(filters).some(f => f !== '')
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtres
                            {Object.values(filters).some(f => f !== '') && (
                                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                                    {Object.values(filters).filter(f => f !== '').length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter Dropdown */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Status Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Tous les statuts</option>
                                        <option value="open">Ouvert</option>
                                        <option value="in_progress">En cours</option>
                                        <option value="closed">Fermé</option>
                                        <option value="reopened">Rouvert</option>
                                    </select>
                                </div>

                                {/* Group Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Département</label>
                                    <select
                                        value={filters.group}
                                        onChange={(e) => setFilters(prev => ({ ...prev, group: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Tous les groupes</option>
                                        <option value="Director">Director</option>
                                        <option value="Manager">Manager</option>
                                        <option value="HR">HR</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Employee">Employee</option>
                                        <option value="Intern">Intern</option>
                                    </select>
                                </div>

                                {/* Priority Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
                                    <select
                                        value={filters.priority}
                                        onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Toutes les priorités</option>
                                        <option value="P1">P1 - Plus Haute</option>
                                        <option value="P2">P2 - Haute</option>
                                        <option value="P3">P3 - Moyenne</option>
                                        <option value="P4">P4 - Faible</option>
                                    </select>
                                </div>

                                {/* Time Filter */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Période</label>
                                    <select
                                        value={filters.time}
                                        onChange={(e) => setFilters(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Toutes les périodes</option>
                                        <option value="today">Aujourd'hui</option>
                                        <option value="week">Cette semaine</option>
                                        <option value="month">Ce mois</option>
                                    </select>
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {Object.values(filters).some(f => f !== '') && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => setFilters({ status: '', group: '', priority: '', time: '' })}
                                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Effacer tous les filtres
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Column Headers */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        <div className="col-span-2">ID</div>
                        <div className="col-span-2">Date de création</div>
                        <div className="col-span-2">Demandeur</div>
                        <div className="col-span-1">Département</div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-2">Sujet</div>
                        <div className="col-span-1">Priorité</div>
                        <div className="col-span-1">Statut</div>
                    </div>
                </div>

                {/* Tickets List */}
                {isLoading ? (
                    <div className="divide-y divide-gray-200">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="px-6 py-4 animate-pulse">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                                    </div>
                                    <div className="col-span-3">
                                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-6 bg-gray-200 rounded-full w-8"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tickets?.results?.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {sortTicketsByPriority(tickets.results).map((ticket: Ticket) => (
                            <div
                                key={ticket.id}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                                onClick={() => handleTicketClick(ticket.id)}
                            >
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    {/* ID */}
                                    <div className="col-span-2">
                                        <div className="text-sm font-medium text-gray-900">
                                            {ticket.short_id}
                                        </div>
                                    </div>

                                    {/* Date de création */}
                                    <div className="col-span-2">
                                        <div className="text-sm text-gray-600">
                                            {format(new Date(ticket.created_at), 'dd/MM/yyyy')}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {format(new Date(ticket.created_at), 'HH:mm')}
                                        </div>
                                    </div>

                                    {/* Demandeur */}
                                    <div className="col-span-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-xs font-medium text-blue-700">
                                                    {ticket.requester.first_name[0]}{ticket.requester.last_name[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {ticket.requester.first_name} {ticket.requester.last_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {ticket.requester.email}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Département */}
                                    <div className="col-span-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {ticket.requester?.group || 'N/A'}
                                        </span>
                                    </div>

                                    {/* Type */}
                                    <div className="col-span-1">
                                        <span className="text-sm text-gray-600">
                                            {ticket.type}
                                        </span>
                                    </div>

                                    {/* Sujet */}
                                    <div className="col-span-2">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {ticket.subject}
                                        </div>
                                        {ticket.attachments && ticket.attachments.length > 0 && (
                                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                                                <Paperclip className="h-3 w-3" />
                                                <span>{ticket.attachments.length}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Priorité */}
                                    <div className="col-span-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </div>

                                    {/* Statut */}
                                    <div className="col-span-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                            {getStatusDisplayName(ticket.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        {tickets?.count > 0 && Math.ceil(tickets.count / 20) > 1 && (
                            <div className="bg-white border-t border-gray-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Affichage de {((currentPage - 1) * 20) + 1} à {Math.min(currentPage * 20, tickets.count)} sur {tickets.count} tickets
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Précédent
                                        </button>

                                        {/* Page numbers */}
                                        <div className="flex items-center space-x-1">
                                            {(() => {
                                                const totalPages = Math.ceil(tickets.count / 20)
                                                const maxVisiblePages = 5

                                                if (totalPages <= 1) {
                                                    return null
                                                }

                                                let startPage = 1
                                                let endPage = Math.min(maxVisiblePages, totalPages)

                                                if (totalPages > maxVisiblePages) {
                                                    if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
                                                        startPage = 1
                                                        endPage = maxVisiblePages
                                                    } else if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
                                                        startPage = totalPages - maxVisiblePages + 1
                                                        endPage = totalPages
                                                    } else {
                                                        startPage = currentPage - Math.floor(maxVisiblePages / 2)
                                                        endPage = currentPage + Math.floor(maxVisiblePages / 2)
                                                    }
                                                }

                                                const pages = []
                                                for (let i = startPage; i <= endPage; i++) {
                                                    pages.push(i)
                                                }

                                                return pages.map(pageNum => (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-lg transition-colors duration-200 ${currentPage === pageNum
                                                            ? 'bg-blue-600 text-white'
                                                            : 'text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ))
                                            })()}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            disabled={currentPage >= Math.ceil(tickets.count / 20)}
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                        >
                                            Suivant
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border-t border-gray-200 px-6 py-16 text-center">
                        <div className="text-gray-400 mb-4">
                            <AlertTriangle className="h-12 w-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun ticket trouvé</h3>
                        <p className="text-gray-600 mb-6">
                            Aucun ticket ne correspond à vos filtres actuels.
                        </p>
                        {user?.role === 'employee' && (
                            <button
                                onClick={() => router.push('/tickets/new')}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Créer Votre Premier Ticket
                            </button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

// Main export with Suspense boundary
export default function TicketsPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
                            <p className="text-gray-600 mt-1">Chargement...</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card animate-pulse">
                                <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        }>
            <TicketsPageContent />
        </Suspense>
    )
} 