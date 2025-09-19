'use client'

import { useState, useEffect } from 'react'
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
    CheckCircle,
    User,
    Clock,
    AlertTriangle,
    FileText,
    Download,
    Eye,
    Phone,
    Target,
    Users,
    History,
    Zap,
    RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'

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
    closure_reports?: Array<{
        id: string
        problem_type: string
        problem_subtype: string
        root_cause: string
        solution_applied: string
        is_recurring_problem: boolean
        parts_used: string
        technical_notes: string
        recommendations: string
        resolution_time_hours: number
        resolution_time_minutes: number
        created_at: string
        created_by: {
            id: string
            first_name: string
            last_name: string
        }
        replaced_parts?: Array<{
            id: string
            part_name: string
            serial_number: string
        }>
    }>
}

interface TechnicianTicketProps {
    ticketId: string
}

export default function TechnicianTicket({ ticketId }: TechnicianTicketProps) {
    const { user } = useAuth()
    const { addNotification } = useNotifications()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [message, setMessage] = useState('')
    const [isClosing, setIsClosing] = useState(false)
    const [showAddTechnician, setShowAddTechnician] = useState(false)
    const [selectedTechnician, setSelectedTechnician] = useState('')
    const [availableTechnicians, setAvailableTechnicians] = useState([])
    const [showClosureForm, setShowClosureForm] = useState(false)
    const [closureFormData, setClosureFormData] = useState({
        problem_type: '',
        problem_subtype: '',
        root_cause: '',
        solution_applied: '',
        is_recurring_problem: false,
        parts_used: '',
        technical_notes: '',
        recommendations: '',
        replaced_parts: [] as Array<{ part_name: string, serial_number: string }>,
        attachments: [] as File[]
    })

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

    // Accept ticket mutation
    const acceptTicketMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post(`/api/tickets/${ticketId}/accept/`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            addNotification({
                type: 'success',
                title: 'Ticket Accepté',
                message: `Le ticket ${ticket?.short_id} a été accepté et est maintenant en cours.`,
                ticketId: ticketId
            })
        }
    })

    // Close ticket mutation
    const closeTicketMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post(`/api/tickets/${ticketId}/close/`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            addNotification({
                type: 'info',
                title: 'Ticket Fermé',
                message: `Le ticket ${ticket?.short_id} a été fermé avec succès.`,
                ticketId: ticketId
            })
        }
    })

    // Create closure report mutation
    const createClosureReportMutation = useMutation({
        mutationFn: async ({ formData, pdfFileName }: { formData: FormData, pdfFileName: string }) => {
            const response = await api.post(`/api/tickets/${ticketId}/closure-report/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            return { data: response.data, pdfFileName }
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            setShowClosureForm(false)
            setClosureFormData({
                problem_type: '',
                problem_subtype: '',
                root_cause: '',
                solution_applied: '',
                is_recurring_problem: false,
                parts_used: '',
                technical_notes: '',
                recommendations: '',
                replaced_parts: [],
                attachments: []
            })
            addNotification({
                type: 'success',
                title: 'Rapport de Fermeture Créé',
                message: `Le rapport de fermeture pour le ticket ${ticket?.short_id} a été créé avec succès. Le PDF "${response.pdfFileName}" a été attaché au ticket.`,
                ticketId: ticketId
            })
        },
        onError: (error) => {
            console.error('Error creating closure report:', error)

            // Extract detailed error message
            let errorMessage = 'Une erreur est survenue lors de la création du rapport de fermeture.'
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as any).response
                if (response?.data) {
                    console.error('Detailed error response:', response.data)

                    // Handle validation errors
                    if (typeof response.data === 'object') {
                        const errorKeys = Object.keys(response.data)
                        if (errorKeys.length > 0) {
                            const firstError = response.data[errorKeys[0]]
                            if (Array.isArray(firstError)) {
                                errorMessage = `${errorKeys[0]}: ${firstError[0]}`
                            } else {
                                errorMessage = `${errorKeys[0]}: ${firstError}`
                            }
                        }
                    } else if (typeof response.data === 'string') {
                        errorMessage = response.data
                    }
                }
            }

            addNotification({
                type: 'error',
                title: 'Erreur',
                message: errorMessage
            })
        }
    })

    // Reopen ticket mutation
    const reopenTicketMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post(`/api/tickets/${ticketId}/reopen/`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            addNotification({
                type: 'success',
                title: 'Ticket Rouvert',
                message: `Le ticket ${ticket?.short_id} a été rouvert avec succès.`,
                ticketId: ticketId
            })
        }
    })

    // Add technician mutation
    const addTechnicianMutation = useMutation({
        mutationFn: async (technicianId: string) => {
            const response = await api.post(`/api/tickets/${ticketId}/add-technician/`, {
                technician_id: technicianId
            })
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            setSelectedTechnician('')
            setShowAddTechnician(false)
            addNotification({
                type: 'success',
                title: 'Technicien Ajouté',
                message: 'Le collègue a été ajouté au ticket avec succès.',
                ticketId: ticketId
            })
        }
    })

    // Fetch available technicians
    const { data: technicians } = useQuery({
        queryKey: ['technicians'],
        queryFn: async () => {
            const response = await api.get('/api/reports/technicians-list/')
            const allTechnicians = response.data.technicians || []

            // Filter out current user and already assigned technicians
            return allTechnicians.filter((tech: any) =>
                tech.id !== user?.id &&
                !ticket?.additional_technicians?.some((assigned: any) => assigned.id === tech.id)
            )
        },
        enabled: showAddTechnician && !!ticket
    })

    const handleSendMessage = () => {
        if (message.trim()) {
            sendMessageMutation.mutate(message.trim())
        }
    }

    const handleAcceptTicket = () => {
        acceptTicketMutation.mutate()
    }

    const handleCloseTicket = () => {
        setShowClosureForm(true)
    }

    const handleAddReplacedPart = () => {
        setClosureFormData({
            ...closureFormData,
            replaced_parts: [...closureFormData.replaced_parts, { part_name: '', serial_number: '' }]
        })
    }

    const handleUpdateReplacedPart = (index: number, field: 'part_name' | 'serial_number', value: string) => {
        const updatedParts = [...closureFormData.replaced_parts]
        updatedParts[index] = { ...updatedParts[index], [field]: value }
        setClosureFormData({
            ...closureFormData,
            replaced_parts: updatedParts
        })
    }

    const handleRemoveReplacedPart = (index: number) => {
        const updatedParts = closureFormData.replaced_parts.filter((_, i) => i !== index)
        setClosureFormData({
            ...closureFormData,
            replaced_parts: updatedParts
        })
    }

    const calculateResolutionTime = () => {
        if (!ticket) return 'N/A'

        const now = new Date()
        const startDate = ticket.claimed_by ? new Date(ticket.updated_at) : new Date(ticket.created_at)
        const duration = now.getTime() - startDate.getTime()

        const hours = Math.floor(duration / (1000 * 60 * 60))
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 0) {
            return `${hours}h ${minutes}min`
        } else {
            return `${minutes}min`
        }
    }

    const generatePDFForReport = (report: any, reportNumber: number) => {
        const doc = new jsPDF()

        // Set font
        doc.setFont('helvetica')

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('RAPPORT DE FERMETURE', 105, 20, { align: 'center' })

        // Ticket information
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`Ticket: ${ticket?.short_id}`, 20, 35)
        doc.text(`Sujet: ${ticket?.subject}`, 20, 42)
        doc.text(`Date de fermeture: ${format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}`, 20, 49)
        doc.text(`Technicien: ${report.created_by.first_name} ${report.created_by.last_name}`, 20, 56)

        // Line separator
        doc.line(20, 65, 190, 65)

        let yPosition = 75

        // Type de problème
        doc.setFont('helvetica', 'bold')
        doc.text('Type de problème:', 20, yPosition)
        doc.setFont('helvetica', 'normal')
        doc.text(report.problem_type, 60, yPosition)
        yPosition += 10

        // Sous-type
        if (report.problem_subtype) {
            doc.setFont('helvetica', 'bold')
            doc.text('Sous-type:', 20, yPosition)
            doc.setFont('helvetica', 'normal')
            doc.text(report.problem_subtype, 60, yPosition)
            yPosition += 10
        }

        // Cause racine
        doc.setFont('helvetica', 'bold')
        doc.text('Cause racine:', 20, yPosition)
        yPosition += 7
        doc.setFont('helvetica', 'normal')
        const rootCauseLines = doc.splitTextToSize(report.root_cause, 170)
        doc.text(rootCauseLines, 20, yPosition)
        yPosition += rootCauseLines.length * 5 + 5

        // Solution appliquée
        doc.setFont('helvetica', 'bold')
        doc.text('Solution appliquée:', 20, yPosition)
        yPosition += 7
        doc.setFont('helvetica', 'normal')
        const solutionLines = doc.splitTextToSize(report.solution_applied, 170)
        doc.text(solutionLines, 20, yPosition)
        yPosition += solutionLines.length * 5 + 5

        // Pièces/Logiciels utilisés
        if (report.parts_used) {
            doc.setFont('helvetica', 'bold')
            doc.text('Pièces/Logiciels utilisés:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const partsLines = doc.splitTextToSize(report.parts_used, 170)
            doc.text(partsLines, 20, yPosition)
            yPosition += partsLines.length * 5 + 5
        }

        // Pièces remplacées
        if (report.replaced_parts && report.replaced_parts.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Pièces remplacées:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')

            report.replaced_parts.forEach((part: any, index: number) => {
                doc.text(`${index + 1}. ${part.part_name}`, 25, yPosition)
                if (part.serial_number) {
                    doc.text(`   S/N: ${part.serial_number}`, 30, yPosition + 5)
                    yPosition += 10
                } else {
                    yPosition += 5
                }
            })
            yPosition += 5
        }

        // Notes techniques
        if (report.technical_notes) {
            doc.setFont('helvetica', 'bold')
            doc.text('Notes techniques:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const notesLines = doc.splitTextToSize(report.technical_notes, 170)
            doc.text(notesLines, 20, yPosition)
            yPosition += notesLines.length * 5 + 5
        }

        // Recommandations
        if (report.recommendations) {
            doc.setFont('helvetica', 'bold')
            doc.text('Recommandations:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const recommendationsLines = doc.splitTextToSize(report.recommendations, 170)
            doc.text(recommendationsLines, 20, yPosition)
            yPosition += recommendationsLines.length * 5 + 5
        }

        // Problème récurrent
        if (report.is_recurring_problem) {
            doc.setFont('helvetica', 'bold')
            doc.text('Problème récurrent: Oui', 20, yPosition)
            yPosition += 10
        }

        // Temps de résolution
        doc.setFont('helvetica', 'bold')
        doc.text('Temps de résolution:', 20, yPosition)
        doc.setFont('helvetica', 'normal')
        const resolutionTime = report.resolution_time_hours > 0
            ? `${report.resolution_time_hours}h ${report.resolution_time_minutes}min`
            : `${report.resolution_time_minutes}min`
        doc.text(resolutionTime, 80, yPosition)
        yPosition += 10

        // Footer
        doc.setFontSize(8)
        doc.text('Rapport généré automatiquement par le système de tickets', 105, 280, { align: 'center' })

        return doc
    }

    const downloadReportPDF = (report: any, reportNumber: number) => {
        const doc = generatePDFForReport(report, reportNumber)
        const fileName = reportNumber === 1 ? 'Rapport_fermeture.pdf' : `Rapport_fermeture_${reportNumber}.pdf`
        doc.save(fileName)
    }

    const generatePDFReport = () => {
        const doc = new jsPDF()

        // Set font
        doc.setFont('helvetica')

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('RAPPORT DE FERMETURE', 105, 20, { align: 'center' })

        // Ticket information
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`Ticket: ${ticket?.short_id}`, 20, 35)
        doc.text(`Sujet: ${ticket?.subject}`, 20, 42)
        doc.text(`Date de fermeture: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 49)
        doc.text(`Technicien: ${user?.first_name} ${user?.last_name}`, 20, 56)

        // Line separator
        doc.line(20, 65, 190, 65)

        let yPosition = 75

        // Type de problème
        doc.setFont('helvetica', 'bold')
        doc.text('Type de problème:', 20, yPosition)
        doc.setFont('helvetica', 'normal')
        doc.text(closureFormData.problem_type, 60, yPosition)
        yPosition += 10

        // Sous-type
        if (closureFormData.problem_subtype) {
            doc.setFont('helvetica', 'bold')
            doc.text('Sous-type:', 20, yPosition)
            doc.setFont('helvetica', 'normal')
            doc.text(closureFormData.problem_subtype, 60, yPosition)
            yPosition += 10
        }

        // Cause racine
        doc.setFont('helvetica', 'bold')
        doc.text('Cause racine:', 20, yPosition)
        yPosition += 7
        doc.setFont('helvetica', 'normal')
        const rootCauseLines = doc.splitTextToSize(closureFormData.root_cause, 170)
        doc.text(rootCauseLines, 20, yPosition)
        yPosition += rootCauseLines.length * 5 + 5

        // Solution appliquée
        doc.setFont('helvetica', 'bold')
        doc.text('Solution appliquée:', 20, yPosition)
        yPosition += 7
        doc.setFont('helvetica', 'normal')
        const solutionLines = doc.splitTextToSize(closureFormData.solution_applied, 170)
        doc.text(solutionLines, 20, yPosition)
        yPosition += solutionLines.length * 5 + 5

        // Pièces/Logiciels utilisés
        if (closureFormData.parts_used) {
            doc.setFont('helvetica', 'bold')
            doc.text('Pièces/Logiciels utilisés:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const partsLines = doc.splitTextToSize(closureFormData.parts_used, 170)
            doc.text(partsLines, 20, yPosition)
            yPosition += partsLines.length * 5 + 5
        }

        // Pièces remplacées
        if (closureFormData.replaced_parts.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Pièces remplacées:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')

            closureFormData.replaced_parts.forEach((part, index) => {
                doc.text(`${index + 1}. ${part.part_name}`, 25, yPosition)
                if (part.serial_number) {
                    doc.text(`   S/N: ${part.serial_number}`, 30, yPosition + 5)
                    yPosition += 10
                } else {
                    yPosition += 5
                }
            })
            yPosition += 5
        }

        // Problème récurrent
        if (closureFormData.is_recurring_problem) {
            doc.setFont('helvetica', 'bold')
            doc.text('Problème récurrent: Oui', 20, yPosition)
            yPosition += 10
        }

        // Notes techniques
        if (closureFormData.technical_notes) {
            doc.setFont('helvetica', 'bold')
            doc.text('Notes techniques:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const notesLines = doc.splitTextToSize(closureFormData.technical_notes, 170)
            doc.text(notesLines, 20, yPosition)
            yPosition += notesLines.length * 5 + 5
        }

        // Recommandations
        if (closureFormData.recommendations) {
            doc.setFont('helvetica', 'bold')
            doc.text('Recommandations:', 20, yPosition)
            yPosition += 7
            doc.setFont('helvetica', 'normal')
            const recommendationsLines = doc.splitTextToSize(closureFormData.recommendations, 170)
            doc.text(recommendationsLines, 20, yPosition)
            yPosition += recommendationsLines.length * 5 + 5
        }

        // Temps de résolution
        doc.setFont('helvetica', 'bold')
        doc.text('Temps de résolution:', 20, yPosition)
        doc.setFont('helvetica', 'normal')
        const resolutionTime = calculateResolutionTime()
        doc.text(resolutionTime, 80, yPosition)
        yPosition += 10

        // Footer
        doc.setFontSize(8)
        doc.text('Rapport généré automatiquement par le système de tickets', 105, 280, { align: 'center' })

        return doc
    }

    const handleSubmitClosureForm = async () => {
        // Count existing closure reports to determine the number
        const existingReportsCount = ticket?.closure_reports?.length || 0
        const reportNumber = existingReportsCount + 1
        const pdfFileName = existingReportsCount > 0 ? `Rapport_fermeture_${reportNumber}.pdf` : 'Rapport_fermeture.pdf'

        // Generate PDF first
        const pdfDoc = generatePDFReport()
        const pdfBlob = pdfDoc.output('blob')
        const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' })

        // First, attach the PDF to the ticket
        try {
            const attachmentFormData = new FormData()
            attachmentFormData.append('file', pdfFile)

            await api.post(`/api/tickets/${ticketId}/attachments/`, attachmentFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
        } catch (error) {
            console.error('Error attaching PDF to ticket:', error)
            addNotification({
                type: 'error',
                title: 'Erreur',
                message: 'Erreur lors de l\'attachement du PDF au ticket.'
            })
            return
        }

        // Then create the closure report
        const formData = new FormData()

        // Add all form fields
        formData.append('problem_type', closureFormData.problem_type)
        formData.append('problem_subtype', closureFormData.problem_subtype)
        formData.append('root_cause', closureFormData.root_cause)
        formData.append('solution_applied', closureFormData.solution_applied)
        formData.append('is_recurring_problem', closureFormData.is_recurring_problem.toString())
        formData.append('parts_used', closureFormData.parts_used)
        formData.append('technical_notes', closureFormData.technical_notes)
        formData.append('recommendations', closureFormData.recommendations)

        // Add replaced parts as JSON string
        if (closureFormData.replaced_parts.length > 0) {
            formData.append('replaced_parts', JSON.stringify(closureFormData.replaced_parts))
        }

        // Add other attachments (not the PDF, as it's already attached to the ticket)
        closureFormData.attachments.forEach((file) => {
            formData.append('attachments', file)
        })

        createClosureReportMutation.mutate({ formData, pdfFileName })
    }

    const handleReopenTicket = () => {
        if (confirm('Êtes-vous sûr de vouloir rouvrir ce ticket ?')) {
            reopenTicketMutation.mutate()
        }
    }

    const handleAddTechnician = () => {
        if (selectedTechnician) {
            addTechnicianMutation.mutate(selectedTechnician)
        }
    }

    const handleShowAddTechnician = () => {
        setShowAddTechnician(!showAddTechnician)
        setSelectedTechnician('')
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
                        <div className="flex items-center space-x-4">
                            <p className="text-gray-600">Créé par {ticket.requester.first_name} {ticket.requester.last_name}</p>
                            <span className="text-gray-400">•</span>
                            <p className="text-gray-500 text-sm">
                                {format(new Date(ticket.created_at), 'dd MMM yyyy à HH:mm')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Ticket Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Détails du Ticket</h2>
                            <div className="flex items-center space-x-3">
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getPriorityColor(ticket.priority)}`}>
                                    {ticket.priority}
                                </span>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(ticket.status)}`}>
                                    {getStatusDisplayName(ticket.status)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Type</label>
                                    <p className="text-gray-900 text-lg font-medium">{ticket.type}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Créé</label>
                                    <p className="text-gray-900 text-lg font-medium">{format(new Date(ticket.created_at), 'dd MMM yyyy à HH:mm')}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                    <div
                                        className="text-gray-900 ticket-description leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: ticket.description }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Dernière Mise à Jour</label>
                                <p className="text-gray-900 text-lg font-medium">{format(new Date(ticket.updated_at), 'dd MMM yyyy à HH:mm')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    {ticket.attachments.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <Paperclip className="h-4 w-4 text-indigo-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Pièces Jointes</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {ticket.attachments.map((attachment) => {
                                    const isImage = attachment.mime_type.startsWith('image/')
                                    const isVideo = attachment.mime_type.startsWith('video/')
                                    return (
                                        <div key={attachment.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
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
                                            {isVideo && (
                                                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                                    <video
                                                        src={attachment.storage_url}
                                                        controls
                                                        className="max-w-full max-h-full"
                                                        preload="metadata"
                                                    >
                                                        Votre navigateur ne supporte pas la lecture de vidéos.
                                                    </video>
                                                </div>
                                            )}
                                            <div className="flex items-center p-4">
                                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                                                    <Paperclip className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{attachment.file_name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">
                                                        {(attachment.size_bytes / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => window.open(attachment.storage_url, '_blank')}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all duration-200"
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
                            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
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
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-xs font-semibold">
                                                {msg.sender.first_name} {msg.sender.last_name}
                                            </span>
                                            <span className={`text-xs ${msg.sender.id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed">{msg.message_text}</p>
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
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-4 -mt-28">
                    {/* Status & Priority Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <Target className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Statut & Priorité</h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${ticket.priority === 'P1' ? 'bg-red-100 text-red-800 border border-red-200' :
                                ticket.priority === 'P2' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                    ticket.priority === 'P3' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                        'bg-green-100 text-green-800 border border-green-200'
                                }`}>
                                {ticket.priority}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                    ticket.status === 'closed' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                                        'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                {ticket.status === 'open' ? 'Ouvert' :
                                    ticket.status === 'in_progress' ? 'En Cours' :
                                        ticket.status === 'closed' ? 'Fermé' : 'Rouvert'}
                            </span>
                        </div>
                    </div>

                    {/* Requester Info */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <User className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Demandeur</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
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
                        </div>
                    </div>

                    {/* Assignment Info */}
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
                                    <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl border border-green-100">
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

                                    {/* Add Colleague Section - Only show for ticket owner */}
                                    {ticket.claimed_by?.id === user?.id && (
                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={handleShowAddTechnician}
                                                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                            >
                                                <User className="h-4 w-4" />
                                                <span>{showAddTechnician ? 'Annuler' : 'Ajouter un Collègue'}</span>
                                            </button>

                                            {showAddTechnician && (
                                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                                                    {technicians && technicians.length > 0 ? (
                                                        <>
                                                            <select
                                                                value={selectedTechnician}
                                                                onChange={(e) => setSelectedTechnician(e.target.value)}
                                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                                                            >
                                                                <option value="">Sélectionner un collègue...</option>
                                                                {technicians.map((tech: any) => (
                                                                    <option key={tech.id} value={tech.id}>
                                                                        {tech.first_name} {tech.last_name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={handleAddTechnician}
                                                                disabled={!selectedTechnician || addTechnicianMutation.isPending}
                                                                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                                                            >
                                                                {addTechnicianMutation.isPending ? 'Ajout...' : 'Ajouter au Ticket'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-500 text-center py-4">
                                                            Aucun collègue disponible à ajouter
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-xl border border-red-100">
                                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-base">Non Réclamé</p>
                                        <p className="text-sm text-red-600">En attente qu'un technicien prenne en charge</p>
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

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-orange-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Actions Rapides</h2>
                        </div>

                        <div className="space-y-3">
                            {!ticket.claimed_by && (
                                <button
                                    onClick={handleAcceptTicket}
                                    disabled={acceptTicketMutation.isPending}
                                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-base shadow-sm hover:shadow-md"
                                >
                                    <User className="h-5 w-5" />
                                    <span>{acceptTicketMutation.isPending ? 'Prise en charge...' : 'Prendre le Ticket'}</span>
                                </button>
                            )}

                            {ticket.status !== 'closed' && ticket.claimed_by?.id === user?.id && (
                                <button
                                    onClick={handleCloseTicket}
                                    disabled={closeTicketMutation.isPending}
                                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-base shadow-sm hover:shadow-md"
                                >
                                    <CheckCircle className="h-5 w-5" />
                                    <span>{closeTicketMutation.isPending ? 'Fermeture...' : 'Fermer le Ticket'}</span>
                                </button>
                            )}

                            {ticket.status === 'closed' && (ticket.claimed_by?.id === user?.id || ticket.additional_technicians?.some(tech => tech.id === user?.id)) && (
                                <button
                                    onClick={handleReopenTicket}
                                    disabled={reopenTicketMutation.isPending}
                                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-base shadow-sm hover:shadow-md"
                                >
                                    <RotateCcw className="h-5 w-5" />
                                    <span>{reopenTicketMutation.isPending ? 'Réouverture...' : 'Rouvrir le Ticket'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Closure Reports Section */}
            {ticket?.closure_reports && ticket.closure_reports.length > 0 && (
                <div className="card">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Rapports de Fermeture</h2>
                    <div className="space-y-4">
                        {ticket.closure_reports.map((report, index) => (
                            <div key={report.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-medium text-gray-900">
                                        Rapport #{index + 1} - {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}
                                    </h3>
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm text-gray-500">
                                            par {report.created_by.first_name} {report.created_by.last_name}
                                        </span>
                                        <button
                                            onClick={() => downloadReportPDF(report, index + 1)}
                                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                        >
                                            <Download className="h-4 w-4" />
                                            <span>Télécharger PDF</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Type de problème:</span>
                                        <p className="text-gray-900">{report.problem_type}</p>
                                    </div>

                                    {report.problem_subtype && (
                                        <div>
                                            <span className="font-medium text-gray-700">Sous-type:</span>
                                            <p className="text-gray-900">{report.problem_subtype}</p>
                                        </div>
                                    )}

                                    <div className="md:col-span-2">
                                        <span className="font-medium text-gray-700">Cause racine:</span>
                                        <p className="text-gray-900 mt-1">{report.root_cause}</p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <span className="font-medium text-gray-700">Solution appliquée:</span>
                                        <p className="text-gray-900 mt-1">{report.solution_applied}</p>
                                    </div>

                                    {report.parts_used && (
                                        <div className="md:col-span-2">
                                            <span className="font-medium text-gray-700">Pièces/Logiciels utilisés:</span>
                                            <p className="text-gray-900 mt-1">{report.parts_used}</p>
                                        </div>
                                    )}

                                    {/* Replaced Parts */}
                                    <div className="md:col-span-2">
                                        <span className="font-medium text-gray-700">Pièces remplacées:</span>
                                        {report.replaced_parts && report.replaced_parts.length > 0 ? (
                                            <div className="mt-1 space-y-1">
                                                {report.replaced_parts.map((part: any, partIndex: number) => (
                                                    <div key={partIndex} className="text-gray-900">
                                                        {partIndex + 1}. {part.part_name}
                                                        {part.serial_number && (
                                                            <span className="text-gray-600 ml-2">(S/N: {part.serial_number})</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 mt-1">Aucune pièce remplacée</p>
                                        )}
                                    </div>

                                    {report.technical_notes && (
                                        <div className="md:col-span-2">
                                            <span className="font-medium text-gray-700">Notes techniques:</span>
                                            <p className="text-gray-900 mt-1">{report.technical_notes}</p>
                                        </div>
                                    )}

                                    {report.recommendations && (
                                        <div className="md:col-span-2">
                                            <span className="font-medium text-gray-700">Recommandations:</span>
                                            <p className="text-gray-900 mt-1">{report.recommendations}</p>
                                        </div>
                                    )}

                                    {report.is_recurring_problem && (
                                        <div className="md:col-span-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Problème récurrent
                                            </span>
                                        </div>
                                    )}

                                    {/* Temps de résolution */}
                                    <div className="md:col-span-2">
                                        <span className="font-medium text-gray-700">Temps de résolution:</span>
                                        <p className="text-gray-900 mt-1">
                                            {report.resolution_time_hours > 0
                                                ? `${report.resolution_time_hours}h ${report.resolution_time_minutes}min`
                                                : `${report.resolution_time_minutes}min`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Closure Form Modal */}
            {showClosureForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">Rapport de Fermeture</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Type de problème */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type de problème *
                                </label>
                                <select
                                    value={closureFormData.problem_type}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, problem_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                >
                                    <option value="">Sélectionner un type</option>
                                    <option value="hardware">Hardware</option>
                                    <option value="software">Software</option>
                                    <option value="network">Network</option>
                                    <option value="other">Autre</option>
                                </select>
                            </div>

                            {/* Sous-type */}
                            {closureFormData.problem_type && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sous-type
                                    </label>
                                    <input
                                        type="text"
                                        value={closureFormData.problem_subtype}
                                        onChange={(e) => setClosureFormData({ ...closureFormData, problem_subtype: e.target.value })}
                                        placeholder="Ex: Imprimante, Windows, Routeur..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            )}

                            {/* Cause racine */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cause racine *
                                </label>
                                <textarea
                                    value={closureFormData.root_cause}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, root_cause: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Solution appliquée */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Solution appliquée *
                                </label>
                                <textarea
                                    value={closureFormData.solution_applied}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, solution_applied: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Pièces/Logiciels utilisés */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pièces/Logiciels utilisés
                                </label>
                                <input
                                    type="text"
                                    value={closureFormData.parts_used}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, parts_used: e.target.value })}
                                    placeholder="Ex: Câble Ethernet, Antivirus..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />

                                {/* Add Part Button */}
                                {closureFormData.parts_used && (
                                    <button
                                        type="button"
                                        onClick={handleAddReplacedPart}
                                        className="mt-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                        + Ajouter une pièce avec numéro de série
                                    </button>
                                )}

                                {/* Dynamic Replaced Parts */}
                                {closureFormData.replaced_parts.map((part, index) => (
                                    <div key={index} className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Nom de la pièce
                                                </label>
                                                <input
                                                    type="text"
                                                    value={part.part_name}
                                                    onChange={(e) => handleUpdateReplacedPart(index, 'part_name', e.target.value)}
                                                    placeholder="Ex: Câble Ethernet"
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Numéro de série
                                                </label>
                                                <div className="flex">
                                                    <input
                                                        type="text"
                                                        value={part.serial_number}
                                                        onChange={(e) => handleUpdateReplacedPart(index, 'serial_number', e.target.value)}
                                                        placeholder="Ex: ABC123456"
                                                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveReplacedPart(index)}
                                                        className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded-r hover:bg-red-200"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Problème récurrent */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="recurring"
                                    checked={closureFormData.is_recurring_problem}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, is_recurring_problem: e.target.checked })}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
                                    Problème récurrent
                                </label>
                            </div>

                            {/* Temps de résolution */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Temps de résolution
                                </label>
                                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
                                    {calculateResolutionTime()}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Calculé automatiquement (Date fermeture - Date revendication/création)
                                </p>
                            </div>

                            {/* Notes techniques */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes techniques
                                </label>
                                <textarea
                                    value={closureFormData.technical_notes}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, technical_notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Recommandations */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recommandations
                                </label>
                                <textarea
                                    value={closureFormData.recommendations}
                                    onChange={(e) => setClosureFormData({ ...closureFormData, recommendations: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Attachments */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pièces jointes
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setClosureFormData({ ...closureFormData, attachments: Array.from(e.target.files) })
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowClosureForm(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmitClosureForm}
                                disabled={createClosureReportMutation.isPending || !closureFormData.problem_type || !closureFormData.root_cause || !closureFormData.solution_applied}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                            >
                                {createClosureReportMutation.isPending ? 'Création...' : 'Créer le Rapport'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
} 