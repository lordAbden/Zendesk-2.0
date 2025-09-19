'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    MessageSquare,
    Paperclip,
    Send,
    User,
    Clock,
    Calendar,
    Download,
    Eye,
    FileText,
    Phone,
    Target,
    Users,
    History,
    Tag
} from 'lucide-react'
import { format } from 'date-fns'

interface Ticket {
    id: string
    short_id: string
    subject: string
    type: string
    description: string
    state: string
    status: string
    priority: string
    requester: {
        id: string
        first_name: string
        last_name: string
        email: string
        phone?: string
        group: string
    }
    assigned_to?: {
        id: string
        first_name: string
        last_name: string
    }
    claimed_by?: {
        id: string
        first_name: string
        last_name: string
    }
    additional_technicians?: Array<{
        id: string
        first_name: string
        last_name: string
    }>
    created_at: string
    updated_at: string
    closed_at?: string
    attachments: Array<{
        id: string
        file_name: string
        mime_type: string
        size_bytes: number
        storage_url: string
    }>
    messages: Array<{
        id: string
        sender: {
            id: string
            first_name: string
            last_name: string
            role: string
        }
        message_text: string
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

interface EmployeeTicketProps {
    ticketId: string
}

export default function EmployeeTicket({ ticketId }: EmployeeTicketProps) {
    const { user } = useAuth()
    const { addNotification } = useNotifications()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [message, setMessage] = useState('')

    // Fetch ticket details
    const { data: ticket, isLoading } = useQuery<Ticket>({
        queryKey: ['ticket', ticketId],
        queryFn: async () => {
            const response = await api.get(`/api/tickets/${ticketId}/`)
            return response.data
        }
    })

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (messageText: string) => {
            const response = await api.post(`/api/tickets/${ticketId}/messages/`, {
                ticket: ticketId,
                message_text: messageText
            })
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            setMessage('')
            addNotification({
                type: 'success',
                title: 'Message Envoyé',
                message: 'Votre message a été envoyé avec succès.',
                ticketId: ticketId
            })
        }
    })

    const handleSendMessage = () => {
        if (message.trim()) {
            sendMessageMutation.mutate(message.trim())
        }
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

    const getEventDescription = (event: any) => {
        switch (event.event_type) {
            case 'created':
                return 'Ticket créé'
            case 'claimed':
                return `Pris en charge par ${event.to_value}`
            case 'assigned':
                return `Assigné à ${event.to_value}`
            case 'technician_added':
                return `${event.to_value} ajouté au ticket`
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
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!ticket) {
        return <div>Ticket non trouvé</div>
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
                            {ticket.short_id} - {ticket.subject}
                        </h1>
                        <p className="text-gray-600 text-lg">
                            {ticket.assigned_to
                                ? `Assigné à ${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name}`
                                : 'En attente d\'assignation'
                            }
                        </p>
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
                    {/* Ticket Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Détails du Ticket</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Type</label>
                                    <p className="text-gray-900 text-lg font-medium mt-1">{ticket.type}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Créé</label>
                                    <p className="text-gray-900 text-lg font-medium mt-1">{format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm')}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                                <div
                                    className="mt-3 bg-gray-50 rounded-xl p-6 border border-gray-100 text-gray-900 whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: ticket.description }}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Dernière Mise à Jour</label>
                                <p className="text-gray-900 text-lg font-medium mt-1">{format(new Date(ticket.updated_at), 'dd MMM yyyy HH:mm')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    {ticket.attachments.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-green-100 rounded-xl">
                                    <Paperclip className="h-5 w-5 text-green-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Pièces Jointes</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {ticket.attachments.map((attachment) => {
                                    const isImage = attachment.mime_type.startsWith('image/')
                                    return (
                                        <div key={attachment.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                            {isImage && (
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
                                            <div className="flex items-center p-4">
                                                <Paperclip className="h-5 w-5 text-gray-400 mr-3" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {(attachment.size_bytes / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => window.open(attachment.storage_url, '_blank')}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Télécharger la pièce jointe"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-xl">
                                <MessageSquare className="h-5 w-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Conversation</h2>
                        </div>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            {ticket.messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.sender.id === user?.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                        }`}>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-xs font-semibold">
                                                {msg.sender.first_name} {msg.sender.last_name}
                                                {msg.sender.role === 'technician' && ' (Technician)'}
                                            </span>
                                            <span className={`text-xs ${msg.sender.id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm">{msg.message_text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Tapez votre message..."
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-500"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || sendMessageMutation.isPending}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-4 -mt-28">
                    {/* Ticket Status */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-orange-100 rounded-xl">
                                <Target className="h-5 w-5 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Statut & Priorité</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600">Status</span>
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(ticket.status)}`}>
                                        {getStatusDisplayName(ticket.status)}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600">Priority</span>
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600">Type</span>
                                    <span className="text-sm font-semibold text-gray-900">{ticket.type}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Assignation</h2>
                        </div>
                        <div className="space-y-4">
                            {ticket.claimed_by ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
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
                                                    <p className="text-xs text-gray-900">{(ticket.claimed_by as any).email || 'Non disponible'}</p>
                                                </div>
                                            </div>
                                            {(ticket.claimed_by as any).phone && (
                                                <div className="flex items-center space-x-3 p-2 bg-white rounded-lg">
                                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                                        <Phone className="h-3 w-3 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-600">Téléphone</p>
                                                        <p className="text-xs text-gray-900">{(ticket.claimed_by as any).phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {ticket.additional_technicians && ticket.additional_technicians.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-gray-700">Techniciens Supplémentaires:</p>
                                            {ticket.additional_technicians.map((tech) => (
                                                <div key={tech.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {tech.first_name} {tech.last_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Non Assigné</p>
                                            <p className="text-sm text-red-600 font-medium">En attente d'assignation</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-gray-100 rounded-xl">
                                <History className="h-5 w-5 text-gray-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Historique des Statuts</h2>
                        </div>
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                            {ticket.events && ticket.events.length > 0 ? (
                                <div className="relative">
                                    {ticket.events.map((event, index) => (
                                        <div key={event.id} className="relative flex items-start space-x-4 pb-4">
                                            {index < ticket.events.length - 1 && (
                                                <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200"></div>
                                            )}
                                            <div className="relative z-10 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                <FileText className="h-3 w-3 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {event.actor.first_name} {event.actor.last_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {format(new Date(event.created_at), 'MMM dd, HH:mm')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                                    {getEventDescription(event)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                                        <History className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">Aucun historique disponible</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 