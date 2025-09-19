'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import DashboardLayout from '@/components/DashboardLayout'
import { ArrowLeft, Paperclip, Send, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface NewTicketForm {
    subject: string
    description: string
}

export default function NewTicketPage() {
    const { user } = useAuth()
    const { addNotification } = useNotifications()
    const router = useRouter()
    const queryClient = useQueryClient()

    // Simple notification function
    const handleNotification = (data: any) => {
        addNotification({
            type: 'success',
            title: 'Ticket Créé',
            message: `Le ticket "${data.subject}" a été créé avec succès.`,
            ticketId: data.id
        })
    }
    const [formData, setFormData] = useState<NewTicketForm>({
        subject: '',
        description: ''
    })
    const [files, setFiles] = useState<File[]>([])

    // ReactQuill configuration
    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ],
    }

    const quillFormats = [
        'header', 'bold', 'italic', 'underline',
        'color', 'background', 'list',
        'link'
    ]

    const createTicketMutation = useMutation({
        mutationFn: async (data: NewTicketForm) => {
            // Clean up ReactQuill content - remove empty HTML tags
            let cleanDescription = data.description
            if (cleanDescription === '<p><br></p>' || cleanDescription === '<p></p>') {
                cleanDescription = ''
            }

            // Create FormData to handle file uploads
            const formData = new FormData()
            formData.append('subject', data.subject)
            formData.append('type', 'Software') // Default type since we removed the selection
            formData.append('description', cleanDescription)

            // Add files to FormData
            files.forEach((file, index) => {
                formData.append(`attachments`, file)
                console.log(`Added file: ${file.name} (${file.size} bytes)`)
            })

            console.log('Submitting ticket with FormData:', {
                subject: data.subject,
                type: 'Other',
                description: cleanDescription,
                originalDescription: data.description,
                fileCount: files.length
            })

            try {
                const response = await api.post('/api/tickets/', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                })
                console.log('Ticket created successfully:', response.data)
                return response.data
            } catch (error) {
                console.error('Error creating ticket:', error)
                // Proper error handling for different error types
                if (error && typeof error === 'object' && 'response' in error) {
                    console.error('Error response:', (error as any).response?.data)
                    console.error('Error status:', (error as any).response?.status)
                    console.error('Error headers:', (error as any).response?.headers)
                } else if (error instanceof Error) {
                    console.error('Error message:', error.message)
                }
                throw error
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            handleNotification(data)
            router.push('/dashboard')
        },
        onError: (error) => {
            console.error('Error creating ticket:', error)

            // Extract detailed error message
            let errorMessage = 'Une erreur est survenue lors de la création du ticket.'
            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as any).response
                if (response?.data) {
                    console.error('Detailed error response:', response.data)

                    // Handle validation errors
                    if (response.data.type && Array.isArray(response.data.type)) {
                        errorMessage = `Erreur de validation: ${response.data.type.join(', ')}`
                    } else if (response.data.detail) {
                        errorMessage = response.data.detail
                    } else if (response.data.error) {
                        errorMessage = response.data.error
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        createTicketMutation.mutate(formData)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)

            // Check total file count
            if (files.length + newFiles.length > 5) {
                alert('Maximum 5 fichiers autorisés')
                return
            }

            // Validate each file
            const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf', 'txt', 'log', 'docx', 'xlsx', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
            const maxSize = 100 * 1024 * 1024 // 100MB

            for (const file of newFiles) {
                // Check file size
                if (file.size > maxSize) {
                    alert(`Le fichier "${file.name}" est trop volumineux. Taille maximum: 100MB`)
                    return
                }

                // Check file type
                const fileExtension = file.name.split('.').pop()?.toLowerCase()
                if (!fileExtension || !allowedTypes.includes(fileExtension)) {
                    alert(`Le fichier "${file.name}" n'est pas dans un format supporté.`)
                    return
                }
            }

            setFiles([...files, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    const getPriorityInfo = () => {
        if (!user) return { priority: 'P4', color: 'text-green-600', description: 'Low priority' }

        const priorityMap: { [key: string]: { priority: string; color: string; description: string } } = {
            'Director': { priority: 'P1', color: 'text-red-600', description: 'Highest priority' },
            'Manager': { priority: 'P2', color: 'text-orange-600', description: 'High priority' },
            'HR': { priority: 'P3', color: 'text-yellow-600', description: 'Medium priority' },
            'Supervisor': { priority: 'P3', color: 'text-yellow-600', description: 'Medium priority' },
            'Employee': { priority: 'P4', color: 'text-green-600', description: 'Low priority' },
            'Intern': { priority: 'P4', color: 'text-green-600', description: 'Low priority' }
        }

        return priorityMap[user.group] || { priority: 'P4', color: 'text-green-600', description: 'Low priority' }
    }

    const priorityInfo = getPriorityInfo()

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Créer un Nouveau Ticket</h1>
                        <p className="text-gray-600">Soumettre une nouvelle demande de support</p>
                    </div>
                </div>

                {/* Priority Info */}
                <div className="card bg-blue-50 border-blue-200">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">
                                Votre ticket sera automatiquement assigné la priorité:
                                <span className={`ml-1 font-bold ${priorityInfo.color}`}>
                                    {priorityInfo.priority}
                                </span>
                            </p>
                            <p className="text-xs text-blue-700">{priorityInfo.description}</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                                Sujet *
                            </label>
                            <input
                                type="text"
                                id="subject"
                                required
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Brève description du problème"
                            />
                        </div>


                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.description}
                                    onChange={(value) => setFormData({ ...formData, description: value })}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Veuillez fournir des informations détaillées sur le problème..."
                                    style={{ minHeight: '150px' }}
                                />
                            </div>
                        </div>

                        {/* File Attachments */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pièces Jointes (Optionnel)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">
                                    Déposez les fichiers ici ou cliquez pour parcourir
                                </p>
                                <p className="text-xs text-gray-500 mb-4">
                                    Maximum 5 fichiers, 100MB chacun. Formats supportés: JPG, PNG, PDF, TXT, LOG, DOCX, XLSX, MP4, AVI, MOV, WMV, FLV, WEBM, MKV
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    accept=".jpg,.jpeg,.png,.pdf,.txt,.log,.docx,.xlsx,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv"
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="btn-secondary cursor-pointer inline-flex items-center gap-2"
                                >
                                    <Paperclip className="h-4 w-4" />
                                    Choisir des Fichiers
                                </label>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Fichiers Sélectionnés:</p>
                                    {files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <Paperclip className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-900">{file.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn-secondary"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={createTicketMutation.isPending}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {createTicketMutation.isPending ? 'Création...' : 'Créer le Ticket'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    )
} 