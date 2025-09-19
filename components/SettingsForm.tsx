'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import {
    User,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    Save,
    Shield
} from 'lucide-react'

interface User {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    role: string
    group: string
}

export default function SettingsForm() {
    const { user, setUser } = useAuth()
    const { addNotification } = useNotifications()

    // Formulaire d'Informations Personnelles
    const [personalInfo, setPersonalInfo] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    })

    // Password Change Form
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })

    // Mutation de mise à jour des informations personnelles
    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.put('/api/auth/profile/update/', data)
            return response.data
        },
        onSuccess: (updatedUser) => {
            setUser(updatedUser)
            addNotification({
                type: 'success',
                title: 'Profil Mis à Jour',
                message: 'Vos informations de profil ont été mises à jour avec succès.',
            })
        },
        onError: (error: any) => {
            addNotification({
                type: 'error',
                title: 'Échec de la Mise à Jour',
                message: error.response?.data?.error || 'Échec de la mise à jour du profil. Veuillez réessayer.',
            })
        }
    })

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.post('/api/auth/change-password/', data)
            return response.data
        },
        onSuccess: () => {
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            })
            addNotification({
                type: 'success',
                title: 'Mot de Passe Modifié',
                message: 'Votre mot de passe a été modifié avec succès.',
            })
        },
        onError: (error: any) => {
            addNotification({
                type: 'error',
                title: 'Échec du Changement de Mot de Passe',
                message: error.response?.data?.error || 'Échec du changement de mot de passe. Veuillez réessayer.',
            })
        }
    })

    const handlePersonalInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateProfileMutation.mutate(personalInfo)
    }

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault()

        if (passwordData.new_password !== passwordData.confirm_password) {
            addNotification({
                type: 'error',
                title: 'Password Mismatch',
                message: 'New password and confirm password do not match.',
            })
            return
        }

        if (passwordData.new_password.length < 8) {
            addNotification({
                type: 'error',
                title: 'Password Too Short',
                message: 'New password must be at least 8 characters long.',
            })
            return
        }

        changePasswordMutation.mutate({
            current_password: passwordData.current_password,
            new_password: passwordData.new_password
        })
    }

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }))
    }

    return (
        <div className="space-y-8">
            {/* Personal Information */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-900">Informations Personnelles</h2>
                </div>

                <form onSubmit={handlePersonalInfoSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prénom
                            </label>
                            <input
                                type="text"
                                value={personalInfo.first_name}
                                onChange={(e) => setPersonalInfo(prev => ({ ...prev, first_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom de Famille
                            </label>
                            <input
                                type="text"
                                value={personalInfo.last_name}
                                onChange={(e) => setPersonalInfo(prev => ({ ...prev, last_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse E-mail
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="email"
                                value={personalInfo.email}
                                onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Numéro de Téléphone
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="tel"
                                value={personalInfo.phone}
                                onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Optionnel"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-500">
                            Rôle: <span className="font-medium capitalize">{user?.role === 'admin' ? 'Administrateur' :
                                user?.role === 'technician' ? 'Technicien' : 'Employé'}</span> •
                            Groupe: <span className="font-medium">{user?.group}</span>
                        </div>
                        <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {updateProfileMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les Modifications'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Change Password */}
            <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-red-600" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-900">Changer le Mot de Passe</h2>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mot de Passe Actuel
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={passwordData.current_password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nouveau Mot de Passe
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="btn-danger flex items-center gap-2"
                        >
                            <Shield className="h-4 w-4" />
                            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
