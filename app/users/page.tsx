'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
    Users,
    UserPlus,
    Search,
    Edit,
    Trash2,
    Eye,
    Plus,
    Filter,
    ChevronDown,
    ChevronUp,
    Save,
    X
} from 'lucide-react'
import { format } from 'date-fns'

interface User {
    id: string
    username: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: 'admin' | 'employee' | 'technician'
    group: string
    date_joined: string
    is_active: boolean
}

interface CreateUserData {
    username: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: 'admin' | 'employee' | 'technician'
    group: string
    password: string
}

interface EditUserData {
    username: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    role: 'admin' | 'employee' | 'technician'
    group: string
}

export default function UsersPage() {
    const { user } = useAuth()
    const router = useRouter()
    const queryClient = useQueryClient()

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [createFormData, setCreateFormData] = useState<CreateUserData>({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'employee',
        group: 'Employee',
        password: ''
    })
    const [editFormData, setEditFormData] = useState<EditUserData>({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'employee',
        group: 'Employee'
    })

    // Fetch users
    const { data: users, isLoading } = useQuery({
        queryKey: ['users', searchTerm, selectedRole, selectedDepartment],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (searchTerm) params.append('search', searchTerm)
            if (selectedRole) params.append('role', selectedRole)
            if (selectedDepartment) params.append('group', selectedDepartment)

            const response = await api.get(`/api/auth/users/?${params}`)
            return response.data.results || response.data
        },
        enabled: user?.role === 'admin'
    })

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (userData: CreateUserData) => {
            const response = await api.post('/api/auth/admin/users/create/', userData)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowCreateForm(false)
            setCreateFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                phone: '',
                role: 'employee',
                group: 'Employee',
                password: ''
            })
        },
        onError: (error: any) => {
            console.error('Erreur lors de la création de l\'utilisateur:', error)
            console.error('Response data:', error.response?.data)
            console.error('Response status:', error.response?.status)

            let errorMessage = 'Erreur inconnue'

            if (error.response?.status === 401) {
                errorMessage = 'Vous n\'êtes pas authentifié. Veuillez vous reconnecter.'
            } else if (error.response?.status === 403) {
                errorMessage = 'Vous n\'avez pas les permissions pour créer des utilisateurs. Seuls les administrateurs peuvent créer des utilisateurs.'
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error
            } else if (error.response?.data) {
                // Handle validation errors
                const errors = error.response.data
                if (typeof errors === 'object') {
                    const errorMessages = Object.entries(errors).map(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            return `${field}: ${messages.join(', ')}`
                        }
                        return `${field}: ${messages}`
                    })
                    errorMessage = errorMessages.join('\n')
                } else {
                    errorMessage = String(errors)
                }
            } else if (error.message) {
                errorMessage = error.message
            }

            alert(`Erreur lors de la création de l'utilisateur:\n${errorMessage}`)
        }
    })

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, userData }: { userId: string, userData: EditUserData }) => {
            const response = await api.put(`/api/auth/admin/users/${userId}/update/`, userData)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setEditingUserId(null)
            setEditFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                phone: '',
                role: 'employee',
                group: 'Employee'
            })
        }
    })

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const response = await api.delete(`/api/auth/admin/users/${userId}/delete/`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
        }
    })

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault()

        // Vérifier que l'utilisateur est admin
        if (user?.role !== 'admin') {
            alert('Seuls les administrateurs peuvent créer des utilisateurs.')
            return
        }

        // Vérifier que tous les champs requis sont remplis
        if (!createFormData.username || !createFormData.email || !createFormData.first_name ||
            !createFormData.last_name || !createFormData.role || !createFormData.group ||
            !createFormData.password) {
            alert('Veuillez remplir tous les champs obligatoires.')
            return
        }

        // Vérifier la longueur du mot de passe
        if (createFormData.password.length < 8) {
            alert('Le mot de passe doit contenir au moins 8 caractères.')
            return
        }

        console.log('Creating user with data:', createFormData)
        createUserMutation.mutate(createFormData)
    }

    const handleEditUser = (user: User) => {
        setEditingUserId(user.id)
        setEditFormData({
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone || '',
            role: user.role,
            group: user.group
        })
    }

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingUserId) {
            updateUserMutation.mutate({ userId: editingUserId, userData: editFormData })
        }
    }

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action ne peut pas être annulée.')) {
            deleteUserMutation.mutate(userId)
        }
    }

    const cancelEdit = () => {
        setEditingUserId(null)
        setEditFormData({
            username: '',
            email: '',
            first_name: '',
            last_name: '',
            phone: '',
            role: 'employee',
            group: 'Employee'
        })
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-800'
            case 'technician': return 'bg-green-100 text-green-800'
            case 'employee': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getGroupColor = (group: string) => {
        switch (group) {
            case 'Director': return 'bg-purple-100 text-purple-800'
            case 'Manager': return 'bg-indigo-100 text-indigo-800'
            case 'HR': return 'bg-pink-100 text-pink-800'
            case 'Supervisor': return 'bg-blue-100 text-blue-800'
            case 'Employee': return 'bg-gray-100 text-gray-800'
            case 'Intern': return 'bg-yellow-100 text-yellow-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (user?.role !== 'admin') {
        return (
            <DashboardLayout>
                <div className="text-center py-8">
                    <p className="text-gray-500">Accès refusé. Privilèges d'administrateur requis.</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Utilisateurs
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Gérer et administrer tous les utilisateurs du système
                            </p>
                        </div>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                            >
                                {showCreateForm ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-2" />
                                        Masquer le Formulaire
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Créer un Utilisateur
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Create User Form */}
                {showCreateForm && (
                    <div className="card">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Créer un Nouvel Utilisateur</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom d'utilisateur *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createFormData.username}
                                        onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={createFormData.email}
                                        onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prénom *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createFormData.first_name}
                                        onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom de famille *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={createFormData.last_name}
                                        onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        value={createFormData.phone}
                                        onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rôle *
                                    </label>
                                    <select
                                        required
                                        value={createFormData.role}
                                        onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="employee">Employé</option>
                                        <option value="technician">Technicien</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Groupe *
                                    </label>
                                    <select
                                        required
                                        value={createFormData.group}
                                        onChange={(e) => setCreateFormData({ ...createFormData, group: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Employee">Employé</option>
                                        <option value="Director">Directeur</option>
                                        <option value="Manager">Gestionnaire</option>
                                        <option value="HR">RH</option>
                                        <option value="Supervisor">Superviseur</option>
                                        <option value="Intern">Stagiaire</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mot de passe *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={createFormData.password}
                                        onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={createUserMutation.isPending}
                                    className="btn-primary px-4 py-2"
                                >
                                    {createUserMutation.isPending ? 'Création...' : 'Créer l\'Utilisateur'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher des utilisateurs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors duration-200"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors duration-200"
                            >
                                <option value="">Tous les Rôles</option>
                                <option value="admin">Administrateur</option>
                                <option value="technician">Technicien</option>
                                <option value="employee">Employé</option>
                            </select>
                            <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors duration-200"
                            >
                                <option value="">Tous les Départements</option>
                                <option value="Employee">Employé</option>
                                <option value="Director">Directeur</option>
                                <option value="Manager">Gestionnaire</option>
                                <option value="HR">RH</option>
                                <option value="Supervisor">Superviseur</option>
                                <option value="Intern">Stagiaire</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                        <div className="col-span-2">Nom</div>
                        <div className="col-span-2">Prénom</div>
                        <div className="col-span-2">Email</div>
                        <div className="col-span-2">Téléphone</div>
                        <div className="col-span-2">Rôle</div>
                        <div className="col-span-1">Département</div>
                        <div className="col-span-1">Actions</div>
                    </div>
                </div>

                {/* Users List */}
                {isLoading ? (
                    <div className="divide-y divide-gray-200">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="px-6 py-4 animate-pulse">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : users && users.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {users.map((user: User) => (
                            <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                                {editingUserId === user.id ? (
                                    // Edit Form
                                    <form onSubmit={handleUpdateUser} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nom d'utilisateur *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editFormData.username}
                                                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Email *
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={editFormData.email}
                                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Prénom *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editFormData.first_name}
                                                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nom de famille *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={editFormData.last_name}
                                                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Téléphone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={editFormData.phone}
                                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Rôle *
                                                </label>
                                                <select
                                                    required
                                                    value={editFormData.role}
                                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="employee">Employé</option>
                                                    <option value="technician">Technicien</option>
                                                    <option value="admin">Administrateur</option>
                                                </select>
                                            </div>
                                            {editFormData.role === 'employee' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Groupe *
                                                    </label>
                                                    <select
                                                        required
                                                        value={editFormData.group}
                                                        onChange={(e) => setEditFormData({ ...editFormData, group: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="Employee">Employé</option>
                                                        <option value="Director">Directeur</option>
                                                        <option value="Manager">Gestionnaire</option>
                                                        <option value="HR">RH</option>
                                                        <option value="Supervisor">Superviseur</option>
                                                        <option value="Intern">Stagiaire</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={updateUserMutation.isPending}
                                                className="btn-primary px-4 py-2"
                                            >
                                                {updateUserMutation.isPending ? 'Mise à jour...' : 'Mettre à Jour'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    // User Display - Table Layout
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        {/* Nom */}
                                        <div className="col-span-2">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.last_name}
                                            </div>
                                        </div>

                                        {/* Prénom */}
                                        <div className="col-span-2">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.first_name}
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="col-span-2">
                                            <div className="text-sm text-gray-600 truncate">
                                                {user.email}
                                            </div>
                                        </div>

                                        {/* Téléphone */}
                                        <div className="col-span-2">
                                            <div className="text-sm text-gray-600">
                                                {user.phone || 'N/A'}
                                            </div>
                                        </div>

                                        {/* Rôle */}
                                        <div className="col-span-2">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                                {user.role === 'admin' ? 'Administrateur' : user.role === 'technician' ? 'Technicien' : 'Employé'}
                                            </span>
                                        </div>

                                        {/* Département */}
                                        <div className="col-span-1">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getGroupColor(user.group)}`}>
                                                {user.group}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1">
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                    title="Modifier"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={deleteUserMutation.isPending}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-t border-gray-200 px-6 py-16 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || selectedRole || selectedDepartment
                                ? 'Aucun utilisateur ne correspond à vos filtres actuels.'
                                : 'Aucun utilisateur dans le système pour le moment.'
                            }
                        </p>
                        {!searchTerm && !selectedRole && !selectedDepartment && user?.role === 'admin' && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Créer le Premier Utilisateur
                            </button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
