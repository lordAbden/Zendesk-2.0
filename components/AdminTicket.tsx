'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
    User,
    Calendar,
    Tag,
    AlertCircle,
    FileText,
    MessageSquare,
    Paperclip,
    Clock,
    CheckCircle,
    XCircle,
    Download,
    ArrowLeft,
    Target,
    Users,
    History,
    Phone
} from 'lucide-react'

interface Ticket {
    id: string
    short_id: string
    subject: string
    description: string
    type: string
    state: string
    status: string
    priority: string
    requester: {
        id: string
        first_name: string
        last_name: string
        email: string
        phone?: string
        role: string
        group: string
    }
    assigned_to?: {
        id: string
        first_name: string
        last_name: string
        email: string
        role: string
    }
    claimed_by?: {
        id: string
        first_name: string
        last_name: string
        email: string
        phone?: string
        role: string
    }
    additional_technicians?: Array<{
        id: string
        first_name: string
        last_name: string
        email: string
        role: string
    }>
    created_at: string
    updated_at: string
    closed_at?: string
    attachments: Array<{
        id: string
        file_name: string
        file_size: number
        created_at: string
        storage_url?: string
        mime_type?: string
    }>
    messages: Array<{
        id: string
        message_text: string
        sender: {
            id: string
            first_name: string
            last_name: string
            role: string
        }
        created_at: string
    }>
    events: Array<{
        id: string
        actor: {
            id: string
            first_name: string
            last_name: string
            role: string
        }
        event_type: string
        from_value?: string
        to_value?: string
        created_at: string
    }>
}

interface AdminTicketProps {
    ticketId: string
}

export default function AdminTicket({ ticketId }: AdminTicketProps) {
    const { user } = useAuth()
    const router = useRouter()

    // Fetch ticket details
    const { data: ticket, isLoading } = useQuery<Ticket>({
        queryKey: ['ticket', ticketId],
        queryFn: async () => {
            const response = await api.get(`/api/tickets/${ticketId}/`)
            return response.data
        }
    })

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

    const getEventDescription = (event: any) => {
        switch (event.event_type) {
            case 'created':
                return 'Ticket créé'
            case 'claimed':
                return `Pris en charge par ${event.to_value}`
            case 'assigned':
                return `Assigné à ${event.to_value}`
            case 'technician_added':
                return `Ajouté ${event.to_value} au ticket`
            case 'status_changed':
                return `Statut changé de ${event.from_value} à ${event.to_value}`
            case 'state_changed':
                return `État changé de ${event.from_value} à ${event.to_value}`
            case 'closed':
                return 'Ticket fermé'
            case 'reopened':
                return 'Ticket rouvert'
            case 'attachment_added':
                return `Pièce jointe ajoutée: ${event.to_value}`
            case 'message_sent':
                return `Message envoyé: ${event.to_value}`
            default:
                return event.event_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Ticket non trouvé</p>
            </div>
        )
    }

    return (
        <div className="space-y-0">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:w-2/3">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Ticket {ticket.short_id}
                        </h1>
                        <p className="text-gray-600 text-lg">{ticket.subject}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                        </span>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(ticket.status)}`}>
                            {getStatusDisplayName(ticket.status)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Description */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Description</h2>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <div
                                className="text-gray-900 ticket-description leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: ticket.description }}
                            />
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
                        </div>
                        {ticket.messages && ticket.messages.length > 0 ? (
                            <div className="space-y-4">
                                {ticket.messages.map((message) => (
                                    <div key={message.id} className="border-l-4 border-blue-500 pl-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-gray-900">
                                                    {message.sender.first_name} {message.sender.last_name}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    ({message.sender.role === 'admin' ? 'Administrateur' :
                                                        message.sender.role === 'technician' ? 'Technicien' : 'Employé'})
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-gray-700">{message.message_text}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">Aucun message pour le moment</p>
                        )}
                    </div>

                    {/* Attachments */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="card">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Pièces Jointes</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ticket.attachments.map((attachment) => {
                                    const isImage = attachment.mime_type?.startsWith('image/')
                                    const fileSize = attachment.file_size ? (attachment.file_size / 1024 / 1024).toFixed(2) : '0'

                                    return (
                                        <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {isImage && attachment.storage_url && (
                                                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                                    <img
                                                        src={attachment.storage_url}
                                                        alt={attachment.file_name}
                                                        className="max-w-full max-h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center p-3">
                                                <Paperclip className="h-5 w-5 text-gray-400 mr-3" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {fileSize} MB
                                                    </p>
                                                </div>
                                                {attachment.storage_url && (
                                                    <button
                                                        onClick={() => window.open(attachment.storage_url, '_blank')}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                        title="Télécharger la pièce jointe"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4 -mt-28">
                    {/* Ticket Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                                <Tag className="h-4 w-4 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Détails du Ticket</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Tag className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-600">Type</span>
                                    <p className="text-sm font-medium text-gray-900">{ticket.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-600">Créé</span>
                                    <p className="text-sm font-medium text-gray-900">
                                        {format(new Date(ticket.created_at), 'dd MMM yyyy à HH:mm')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <span className="text-sm font-semibold text-gray-600">Mis à jour</span>
                                    <p className="text-sm font-medium text-gray-900">
                                        {format(new Date(ticket.updated_at), 'dd MMM yyyy à HH:mm')}
                                    </p>
                                </div>
                            </div>
                            {ticket.closed_at && (
                                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <CheckCircle className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-gray-600">Fermé</span>
                                        <p className="text-sm font-medium text-gray-900">
                                            {format(new Date(ticket.closed_at), 'dd MMM yyyy à HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requester Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Demandeur</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white font-semibold text-lg">
                                        {ticket.requester.first_name[0]}{ticket.requester.last_name[0]}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900 text-base">
                                        {ticket.requester.first_name} {ticket.requester.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500 capitalize">{ticket.requester.group}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <span className="text-sm text-gray-700">{ticket.requester.email}</span>
                                </div>
                                {ticket.requester.phone && (
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Phone className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <span className="text-sm text-gray-700">{ticket.requester.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    {ticket.requester.role === 'admin' ? 'Administrateur' :
                                        ticket.requester.role === 'technician' ? 'Technicien' : 'Employé'}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                    {ticket.requester.group}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Assignation</h2>
                        </div>

                        <div className="space-y-5">
                            {ticket.claimed_by ? (
                                <div className="space-y-5">
                                    {/* Primary Assignee */}
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center space-x-4 mb-3">
                                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                                <CheckCircle className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900 text-base">
                                                    {ticket.claimed_by.first_name} {ticket.claimed_by.last_name}
                                                </p>
                                                <p className="text-sm text-green-600 font-medium">Propriétaire du Ticket</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                                    <Calendar className="h-3 w-3 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-600">Email</p>
                                                    <p className="text-xs text-gray-900">{ticket.claimed_by.email || 'Non disponible'}</p>
                                                </div>
                                            </div>
                                            {ticket.claimed_by.phone && (
                                                <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                                        <Phone className="h-3 w-3 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-600">Téléphone</p>
                                                        <p className="text-xs text-gray-900">{ticket.claimed_by.phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Technicians */}
                                    {ticket.additional_technicians && ticket.additional_technicians.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-gray-700 px-1">Techniciens Supplémentaires</p>
                                            <div className="space-y-2">
                                                {ticket.additional_technicians.map((tech) => (
                                                    <div key={tech.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {tech.first_name} {tech.last_name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-xl border border-red-100">
                                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <AlertCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-base">Aucun technicien assigné</p>
                                        <p className="text-sm text-red-600">En attente d'assignation</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                                <History className="h-4 w-4 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Historique des Statuts</h2>
                        </div>

                        <div className="space-y-4 max-h-80 overflow-y-auto">
                            {ticket.events && ticket.events.length > 0 ? (
                                <div className="space-y-4">
                                    {ticket.events.map((event, index) => (
                                        <div key={event.id} className="relative">
                                            {/* Timeline connector */}
                                            {index < ticket.events.length - 1 && (
                                                <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-200"></div>
                                            )}

                                            <div className="flex items-start space-x-4">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <div className="flex-1 min-w-0 pb-2">
                                                    <div className="flex items-center space-x-3 mb-1">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {event.actor.first_name} {event.actor.last_name}
                                                        </span>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                            {format(new Date(event.created_at), 'MMM dd, HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        {getEventDescription(event)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                        <History className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">Aucune mise à jour de statut pour le moment</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
