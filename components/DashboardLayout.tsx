'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Menu,
    X,
    Home,
    Ticket,
    Plus,
    LogOut,
    User,
    Bell,
    Search,
    Settings,
    BarChart3,
    Users,
    FileText,
    MessageSquare
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import NotificationContainer from './NotificationContainer'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, logout } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

    // Role-based navigation
    const getNavigation = () => {
        if (user?.role === 'admin') {
            return [
                { name: 'Tableau de Bord', href: '/dashboard', icon: Home },
                { name: 'Tous les Tickets', href: '/tickets', icon: Ticket },
                { name: 'Statistiques', href: '/statistics', icon: BarChart3 },
                { name: 'Utilisateurs', href: '/users', icon: Users },
                { name: 'Paramètres', href: '/settings', icon: Settings },
            ]
        } else if (user?.role === 'technician') {
            return [
                { name: 'Tableau de Bord', href: '/dashboard', icon: Home },
                { name: 'Tous les Tickets', href: '/tickets', icon: Ticket },
                { name: 'Paramètres', href: '/settings', icon: Settings },
            ]
        } else {
            return [
                { name: 'Tableau de Bord', href: '/dashboard', icon: Home },
                { name: 'Mes Tickets', href: '/tickets', icon: Ticket },
                { name: 'Nouveau Ticket', href: '/tickets/new', icon: Plus },
                { name: 'Paramètres', href: '/settings', icon: Settings },
            ]
        }
    }

    const navigation = getNavigation()

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile sidebar overlay */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            </div>

            {/* Animated Sidebar - Fixed Position */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:fixed lg:inset-y-0 lg:left-0`}>
                <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Logo Section */}
                    <div className="flex h-32 items-center justify-center border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6">
                        <div className="flex items-center space-x-4 lg:space-x-5">
                            <div className="relative h-20 w-20 lg:h-24 lg:w-24 flex-shrink-0">
                                <Image
                                    src="/logo.jpeg"
                                    alt="Logo"
                                    fill
                                    priority
                                    className="rounded-lg object-contain"
                                    sizes="(max-width: 768px) 80px, 96px"
                                />
                            </div>
                            <div className="text-white text-center">
                                <h1 className="text-lg lg:text-xl font-bold">DGM</h1>
                                <p className="text-xs lg:text-sm text-blue-100">Support Informatique</p>
                            </div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="border-b border-gray-200 p-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                    {user?.role === 'admin' ? 'Administrateur' :
                                        user?.role === 'technician' ? 'Technicien' : 'Employé'} • {user?.group}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                                        }`} />
                                    {item.name}
                                    {isActive && (
                                        <div className="ml-auto h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Logout Section */}
                    <div className="border-t border-gray-200 p-4">
                        <button
                            onClick={handleLogout}
                            className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                        >
                            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors duration-200" />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content - Adjusted for fixed sidebar */}
            <div className="flex-1 lg:ml-64">
                {/* Top bar with search and user info */}
                <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-x-4">
                        <div className="flex items-center gap-x-4">
                            <button
                                type="button"
                                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-6 w-6" />
                            </button>

                            {/* Search bar */}
                            <div className="relative max-w-2xl flex-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                    placeholder="Rechercher des tickets..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-x-4">
                            <NotificationBell />

                            <div className="flex items-center gap-x-4">
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                                    <p className="text-gray-500 capitalize">
                                        {user?.role === 'admin' ? 'Administrateur' :
                                            user?.role === 'technician' ? 'Technicien' : 'Employé'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1">
                    <div className="px-1 sm:px-2 lg:px-3">
                        {children}
                    </div>
                </main>
            </div>

            {/* Notification Container */}
            <NotificationContainer />
        </div>
    )
} 