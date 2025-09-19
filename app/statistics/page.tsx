'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
    BarChart3,
    Users,
    Clock,
    TrendingUp,
    AlertTriangle,
    Calendar,
    UserCheck,
    Monitor,
    RotateCcw,
    Download,
    ChevronDown,
    Filter,
    Calendar as CalendarIcon
} from 'lucide-react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'
import AppleGauge from '@/components/AppleGauge'
import AppleMultiRingChart from '@/components/AppleMultiRingChart'

// Technician Charts Component
interface TechnicianChartsProps {
    technicianFilter: string;
    timeFilter: string;
}

interface TechnicianStats {
    id: string;
    name: string;
    email: string;
    ticketsClaimed: number;
    ticketsClosed: number;
    ticketsReopened: number;
    totalActivity: number;
}

interface TimeSeriesData {
    date: string;
    ticketsClaimed: number;
    ticketsClosed: number;
    ticketsReopened: number;
}

const TechnicianCharts: React.FC<TechnicianChartsProps> = ({ technicianFilter, timeFilter }) => {
    const [chartData, setChartData] = useState<TechnicianStats[] | null>(null);
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[] | null>(null);
    const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                if (technicianFilter !== 'all') params.append('technician_filter', technicianFilter);
                if (timeFilter !== 'all') params.append('time_filter', timeFilter);

                const response = await api.get(`/api/tickets/top-technicians-stats/?${params}`);

                if (technicianFilter !== 'all') {
                    // Single technician - show time series data
                    setTimeSeriesData(response.data.timeSeriesData);
                    setSelectedTechnician(response.data.technician);
                    setChartData(null);
                } else {
                    // Multiple technicians - show bar charts
                    setChartData(response.data.topTechnicians);
                    setTimeSeriesData(null);
                    setSelectedTechnician(null);
                }
            } catch (error) {
                console.error('Error fetching technician stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [technicianFilter, timeFilter]);

    if (isLoading) {
        return (
            <div className="mt-8">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (technicianFilter !== 'all' && timeSeriesData && selectedTechnician) {
        // Show single line chart with 3 lines for single technician
        return (
            <div className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                        Performance de {selectedTechnician.name} (30 derniers jours)
                    </h3>
                    <div className="h-96">
                        <Line
                            data={{
                                labels: timeSeriesData.map(d => new Date(d.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })),
                                datasets: [
                                    {
                                        label: 'Tickets Réclamés',
                                        data: timeSeriesData.map(d => d.ticketsClaimed),
                                        borderColor: '#3B82F6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderWidth: 3,
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                        pointBackgroundColor: '#3B82F6',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 2,
                                    },
                                    {
                                        label: 'Tickets Fermés',
                                        data: timeSeriesData.map(d => d.ticketsClosed),
                                        borderColor: '#10B981',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderWidth: 3,
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                        pointBackgroundColor: '#10B981',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 2,
                                    },
                                    {
                                        label: 'Tickets Rouverts',
                                        data: timeSeriesData.map(d => d.ticketsReopened),
                                        borderColor: '#EF4444',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderWidth: 3,
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 4,
                                        pointHoverRadius: 6,
                                        pointBackgroundColor: '#EF4444',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 2,
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'top' as const,
                                        labels: {
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            padding: 20,
                                            font: {
                                                size: 14,
                                                weight: 500
                                            },
                                            color: '#374151'
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        titleColor: '#ffffff',
                                        bodyColor: '#ffffff',
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        displayColors: true,
                                        intersect: false,
                                        mode: 'index'
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: {
                                            color: 'rgba(0,0,0,0.05)'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    }
                                },
                                interaction: {
                                    intersect: false,
                                    mode: 'index'
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (chartData && chartData.length > 0) {
        // Show grouped bar charts for top 5 technicians
        return (
            <div className="mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                        Top 5 Techniciens - Performance des Tickets
                    </h3>
                    <div className="h-96">
                        <Bar
                            data={{
                                labels: chartData.map(tech => tech.name.split(' ')[0]), // First name only for cleaner display
                                datasets: [
                                    {
                                        label: 'Tickets Réclamés',
                                        data: chartData.map(tech => tech.ticketsClaimed),
                                        backgroundColor: 'rgba(59, 130, 246, 0.9)',
                                        borderColor: '#3B82F6',
                                        borderWidth: 0,
                                        borderRadius: 6,
                                        borderSkipped: false,
                                    },
                                    {
                                        label: 'Tickets Fermés',
                                        data: chartData.map(tech => tech.ticketsClosed),
                                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                                        borderColor: '#10B981',
                                        borderWidth: 0,
                                        borderRadius: 6,
                                        borderSkipped: false,
                                    },
                                    {
                                        label: 'Tickets Rouverts',
                                        data: chartData.map(tech => tech.ticketsReopened),
                                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                        borderColor: '#EF4444',
                                        borderWidth: 0,
                                        borderRadius: 6,
                                        borderSkipped: false,
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                        labels: {
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            padding: 20,
                                            font: {
                                                size: 14,
                                                weight: 500
                                            },
                                            color: '#374151'
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        titleColor: '#ffffff',
                                        bodyColor: '#ffffff',
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        displayColors: true,
                                        intersect: false,
                                        mode: 'index'
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: {
                                            color: 'rgba(0,0,0,0.05)'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    x: {
                                        grid: {
                                            display: false
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    }
                                },
                                interaction: {
                                    intersect: false,
                                    mode: 'index'
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-center py-8">
                    <p className="text-gray-500">Aucune donnée disponible pour les techniciens</p>
                </div>
            </div>
        </div>
    );
};

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
)

type StatisticTab =
    | 'tickets'
    | 'users'
    | 'employees'
    | 'technicians'
    | 'groups'
    | 'sla'
    | 'performance'
    | 'quality'
    | 'trends'
    | 'workload'
    | 'system'
    | 'recurring'

const navigationTabs = [
    { id: 'tickets' as StatisticTab, label: 'Tickets', icon: BarChart3 },
    {
        id: 'users' as StatisticTab,
        label: 'Utilisateurs',
        icon: Users,
        subTabs: [
            { id: 'employees' as StatisticTab, label: 'Employés', icon: Users },
            { id: 'technicians' as StatisticTab, label: 'Techniciens', icon: UserCheck },
            { id: 'groups' as StatisticTab, label: 'Groupes/Départements', icon: Users },
        ]
    },
    { id: 'sla' as StatisticTab, label: 'SLA', icon: Clock },
    { id: 'performance' as StatisticTab, label: 'Performance', icon: TrendingUp },
    { id: 'quality' as StatisticTab, label: 'Qualité', icon: AlertTriangle },
    { id: 'trends' as StatisticTab, label: 'Tendances', icon: Calendar },
    { id: 'workload' as StatisticTab, label: 'Charge de Travail', icon: UserCheck },
    { id: 'system' as StatisticTab, label: 'Système', icon: Monitor },
    { id: 'recurring' as StatisticTab, label: 'Problèmes Récurrents', icon: RotateCcw },
]


export default function StatisticsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<StatisticTab>('tickets')
    const [activeSubTab, setActiveSubTab] = useState<StatisticTab | null>(null)
    const [timeFilter, setTimeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [priorityFilter, setPriorityFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [userFilter, setUserFilter] = useState('all')
    const [technicianFilter, setTechnicianFilter] = useState('all')
    const [groupFilter, setGroupFilter] = useState('all')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    // Build query parameters for API calls
    const buildQueryParams = () => {
        const params = new URLSearchParams()
        params.append('time_filter', timeFilter)
        params.append('status_filter', statusFilter)
        params.append('priority_filter', priorityFilter)
        params.append('type_filter', typeFilter)

        // Only include relevant filters based on active tab
        if (activeTab === 'employees') {
            params.append('user_filter', userFilter)
            params.append('group_filter', groupFilter)
        } else if (activeTab === 'technicians') {
            params.append('technician_filter', technicianFilter)
        } else if (activeTab === 'groups') {
            params.append('group_filter', groupFilter)
        } else {
            // For other tabs (tickets, sla, etc.), include all filters
            params.append('user_filter', userFilter)
            params.append('technician_filter', technicianFilter)
            params.append('group_filter', groupFilter)
        }

        if (timeFilter === 'custom' && customStartDate && customEndDate) {
            params.append('start_date', customStartDate)
            params.append('end_date', customEndDate)
        }

        return params.toString()
    }

    // Get current statistic type for export
    const getCurrentStatisticType = () => {
        const tabLabels: { [key: string]: string } = {
            'tickets': 'Analytiques des Tickets',
            'employees': 'Statistiques des Employés',
            'technicians': 'Statistiques des Techniciens',
            'groups': 'Statistiques des Groupes/Départements',
            'sla': 'Suivi SLA',
            'performance': 'Statistiques de Performance',
            'quality': 'Contrôle Qualité',
            'trends': 'Tendances du Volume de Tickets',
            'workload': 'Analyse de la Charge de Travail',
            'system': 'Statistiques du Système',
            'recurring': 'Problèmes Récurrents'
        }
        return tabLabels[activeTab] || 'Statistiques'
    }

    // Export button component
    const ExportButtons = () => {
        const [showExportMenu, setShowExportMenu] = useState(false)

        const exportOptions = [
            { format: 'pdf', label: 'PDF (.pdf)' },
            { format: 'xlsx', label: 'Excel (.xlsx)' },
            { format: 'csv', label: 'CSV (.csv)' },
            { format: 'png', label: 'PNG (.png)' },
        ]

        const handleExport = async (format: string) => {
            try {
                const statisticType = getCurrentStatisticType()
                let exportData: any = {}
                let fileName = `${statisticType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`

                // Get data based on current active tab
                switch (activeTab) {
                    case 'tickets':
                        exportData = ticketData
                        break
                    case 'employees':
                        exportData = employeeData
                        break
                    case 'technicians':
                        exportData = technicianData
                        break
                    case 'groups':
                        exportData = groupData
                        break
                    case 'sla':
                        exportData = slaData
                        break
                    case 'performance':
                        exportData = performanceData
                        break
                    case 'quality':
                        exportData = qualityData
                        break
                    case 'trends':
                        exportData = trendsData
                        break
                    case 'workload':
                        exportData = workloadData
                        break
                    case 'system':
                        exportData = systemData
                        break
                    case 'recurring':
                        exportData = recurringData
                        break
                    default:
                        exportData = ticketData
                }

                if (format === 'pdf') {
                    // Generate detailed PDF using jsPDF with screenshots
                    const { jsPDF } = await import('jspdf')
                    const { default: html2canvas } = await import('html2canvas')
                    const doc = new jsPDF()

                    // Page 1: Title and Summary
                    doc.setFontSize(24)
                    doc.text(statisticType, 20, 30)

                    // Add company header
                    doc.setFontSize(12)
                    doc.text('Système de Gestion des Tickets - Zendesk 2.0', 20, 45)
                    doc.text(`Rapport généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 55)

                    // Add filters info
                    doc.setFontSize(14)
                    doc.text('Filtres Appliqués', 20, 75)
                    doc.setFontSize(11)
                    doc.text(`• Période: ${timeFilter}`, 20, 90)
                    doc.text(`• Statut: ${statusFilter}`, 20, 100)
                    doc.text(`• Priorité: ${priorityFilter}`, 20, 110)
                    doc.text(`• Type: ${typeFilter}`, 20, 120)

                    // Add data summary
                    if (exportData) {
                        doc.setFontSize(14)
                        doc.text('Résumé des Données', 20, 140)
                        doc.setFontSize(11)
                        doc.text(`• Total d'enregistrements: ${exportData.total_tickets || exportData.total_users || 'N/A'}`, 20, 155)

                        if (exportData.resolution_rate !== undefined) {
                            doc.text(`• Taux de résolution: ${exportData.resolution_rate.toFixed(1)}%`, 20, 165)
                        }
                        if (exportData.avg_resolution_time !== undefined) {
                            doc.text(`• Temps moyen de résolution: ${exportData.avg_resolution_time.toFixed(1)} heures`, 20, 175)
                        }
                        if (exportData.avg_first_response_time !== undefined) {
                            doc.text(`• Temps moyen de première réponse: ${exportData.avg_first_response_time.toFixed(1)} heures`, 20, 185)
                        }
                    }

                    // Add new page for detailed analytics
                    doc.addPage()
                    doc.setFontSize(18)
                    doc.text('Analyses Détaillées', 20, 30)

                    // Add distribution tables
                    let yPos = 50
                    if (exportData?.status_distribution) {
                        doc.setFontSize(14)
                        doc.text('Distribution par Statut', 20, yPos)
                        yPos += 15

                        // Create table for status distribution
                        const statusTableData = exportData.status_distribution.map((item: any) => [
                            item.status,
                            item.count.toString(),
                            `${((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)}%`
                        ])

                        doc.setFontSize(10)
                        doc.text('Statut', 20, yPos)
                        doc.text('Nombre', 80, yPos)
                        doc.text('Pourcentage', 120, yPos)
                        yPos += 10

                        statusTableData.forEach((row: string[]) => {
                            doc.text(row[0], 20, yPos)
                            doc.text(row[1], 80, yPos)
                            doc.text(row[2], 120, yPos)
                            yPos += 8
                        })
                        yPos += 20
                    }

                    if (exportData?.priority_distribution) {
                        doc.setFontSize(14)
                        doc.text('Distribution par Priorité', 20, yPos)
                        yPos += 15

                        const priorityTableData = exportData.priority_distribution.map((item: any) => [
                            item.priority,
                            item.count.toString(),
                            `${((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)}%`
                        ])

                        doc.setFontSize(10)
                        doc.text('Priorité', 20, yPos)
                        doc.text('Nombre', 80, yPos)
                        doc.text('Pourcentage', 120, yPos)
                        yPos += 10

                        priorityTableData.forEach((row: string[]) => {
                            doc.text(row[0], 20, yPos)
                            doc.text(row[1], 80, yPos)
                            doc.text(row[2], 120, yPos)
                            yPos += 8
                        })
                        yPos += 20
                    }

                    // Add screenshot of the current statistics view
                    try {
                        const contentElement = document.querySelector('.bg-white.rounded-lg.shadow-sm:last-child')
                        if (contentElement) {
                            doc.addPage()
                            doc.setFontSize(18)
                            doc.text('Capture d\'Écran - Vue Actuelle', 20, 30)

                            const canvas = await html2canvas(contentElement as HTMLElement, {
                                backgroundColor: '#ffffff',
                                scale: 1.5,
                                useCORS: true,
                                allowTaint: true
                            })

                            const imgData = canvas.toDataURL('image/png')
                            const imgWidth = 170
                            const imgHeight = (canvas.height * imgWidth) / canvas.width

                            doc.addImage(imgData, 'PNG', 20, 50, imgWidth, imgHeight)
                        }
                    } catch (error) {
                        console.error('Error capturing screenshot:', error)
                        doc.addPage()
                        doc.setFontSize(14)
                        doc.text('Note: Impossible de capturer la vue actuelle', 20, 30)
                    }

                    // Add conclusion page
                    doc.addPage()
                    doc.setFontSize(18)
                    doc.text('Conclusion et Recommandations', 20, 30)

                    doc.setFontSize(11)
                    doc.text('Ce rapport présente une analyse complète des statistiques du système de gestion des tickets.', 20, 50)
                    doc.text('Les données exportées incluent:', 20, 65)
                    doc.text('• Distributions par statut, priorité et type', 20, 80)
                    doc.text('• Métriques de performance et temps de résolution', 20, 90)
                    doc.text('• Capture d\'écran de la vue actuelle', 20, 100)
                    doc.text('• Filtres appliqués pour l\'analyse', 20, 110)

                    doc.text('Recommandations:', 20, 130)
                    doc.text('• Analyser les tendances pour améliorer les processus', 20, 145)
                    doc.text('• Identifier les goulots d\'étranglement dans la résolution', 20, 155)
                    doc.text('• Optimiser la répartition des priorités', 20, 165)

                    doc.save(`${fileName}.pdf`)

                } else if (format === 'csv') {
                    // Generate proper CSV with BOM for Excel compatibility
                    let csvContent = '\uFEFF' // UTF-8 BOM for Excel compatibility

                    // Add metadata
                    csvContent += `Rapport,${statisticType}\n`
                    csvContent += `Date d'export,${new Date().toLocaleString('fr-FR')}\n`
                    csvContent += `Période,${timeFilter}\n`
                    csvContent += `Statut,${statusFilter}\n`
                    csvContent += `Priorité,${priorityFilter}\n`
                    csvContent += `Type,${typeFilter}\n\n`

                    if (exportData) {
                        // Add summary data
                        csvContent += `Total d'enregistrements,${exportData.total_tickets || exportData.total_users || 'N/A'}\n`
                        if (exportData.resolution_rate !== undefined) {
                            csvContent += `Taux de résolution,${exportData.resolution_rate.toFixed(1)}%\n`
                        }
                        csvContent += '\n'

                        // Add distribution data with proper headers
                        if (exportData.status_distribution) {
                            csvContent += 'Distribution par Statut\n'
                            csvContent += 'Statut,Nombre,Pourcentage\n'
                            exportData.status_distribution.forEach((item: any) => {
                                const percentage = ((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)
                                csvContent += `${item.status},${item.count},${percentage}%\n`
                            })
                            csvContent += '\n'
                        }

                        if (exportData.priority_distribution) {
                            csvContent += 'Distribution par Priorité\n'
                            csvContent += 'Priorité,Nombre,Pourcentage\n'
                            exportData.priority_distribution.forEach((item: any) => {
                                const percentage = ((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)
                                csvContent += `${item.priority},${item.count},${percentage}%\n`
                            })
                            csvContent += '\n'
                        }

                        if (exportData.type_distribution) {
                            csvContent += 'Distribution par Type\n'
                            csvContent += 'Type,Nombre,Pourcentage\n'
                            exportData.type_distribution.forEach((item: any) => {
                                const percentage = ((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)
                                csvContent += `${item.type},${item.count},${percentage}%\n`
                            })
                        }
                    }

                    // Download CSV with proper MIME type
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                    const link = document.createElement('a')
                    const url = URL.createObjectURL(blob)
                    link.setAttribute('href', url)
                    link.setAttribute('download', `${fileName}.csv`)
                    link.style.visibility = 'hidden'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)

                } else if (format === 'xlsx') {
                    // Generate proper Excel file using xlsx library
                    try {
                        const XLSX = await import('xlsx')

                        // Create workbook
                        const workbook = XLSX.utils.book_new()

                        // Summary sheet
                        const summaryData = [
                            ['Rapport', statisticType],
                            ['Date d\'export', new Date().toLocaleString('fr-FR')],
                            ['Période', timeFilter],
                            ['Statut', statusFilter],
                            ['Priorité', priorityFilter],
                            ['Type', typeFilter],
                            [''],
                            ['Total d\'enregistrements', exportData?.total_tickets || exportData?.total_users || 'N/A'],
                            ['Taux de résolution', exportData?.resolution_rate ? `${exportData.resolution_rate.toFixed(1)}%` : 'N/A'],
                            ['Temps moyen de résolution', exportData?.avg_resolution_time ? `${exportData.avg_resolution_time.toFixed(1)} heures` : 'N/A']
                        ]

                        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
                        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé')

                        // Status distribution sheet
                        if (exportData?.status_distribution) {
                            const statusData = [
                                ['Statut', 'Nombre', 'Pourcentage'],
                                ...exportData.status_distribution.map((item: any) => [
                                    item.status,
                                    item.count,
                                    `${((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)}%`
                                ])
                            ]
                            const statusSheet = XLSX.utils.aoa_to_sheet(statusData)
                            XLSX.utils.book_append_sheet(workbook, statusSheet, 'Distribution Statut')
                        }

                        // Priority distribution sheet
                        if (exportData?.priority_distribution) {
                            const priorityData = [
                                ['Priorité', 'Nombre', 'Pourcentage'],
                                ...exportData.priority_distribution.map((item: any) => [
                                    item.priority,
                                    item.count,
                                    `${((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)}%`
                                ])
                            ]
                            const prioritySheet = XLSX.utils.aoa_to_sheet(priorityData)
                            XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Distribution Priorité')
                        }

                        // Type distribution sheet
                        if (exportData?.type_distribution) {
                            const typeData = [
                                ['Type', 'Nombre', 'Pourcentage'],
                                ...exportData.type_distribution.map((item: any) => [
                                    item.type,
                                    item.count,
                                    `${((item.count / (exportData.total_tickets || 1)) * 100).toFixed(1)}%`
                                ])
                            ]
                            const typeSheet = XLSX.utils.aoa_to_sheet(typeData)
                            XLSX.utils.book_append_sheet(workbook, typeSheet, 'Distribution Type')
                        }

                        // Generate Excel file
                        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
                        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                        const link = document.createElement('a')
                        const url = URL.createObjectURL(blob)
                        link.setAttribute('href', url)
                        link.setAttribute('download', `${fileName}.xlsx`)
                        link.style.visibility = 'hidden'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                    } catch (error) {
                        console.error('Error generating Excel file:', error)
                        alert('Erreur lors de la génération du fichier Excel. Veuillez installer la bibliothèque xlsx.')
                    }

                } else if (format === 'png') {
                    // Capture the current tab content as PNG
                    const contentElement = document.querySelector('.bg-white.rounded-lg.shadow-sm:last-child')
                    if (contentElement) {
                        // Use html2canvas to capture the element
                        const { default: html2canvas } = await import('html2canvas')
                        const canvas = await html2canvas(contentElement as HTMLElement, {
                            backgroundColor: '#ffffff',
                            scale: 2,
                            useCORS: true
                        })

                        // Convert canvas to blob and download
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const link = document.createElement('a')
                                const url = URL.createObjectURL(blob)
                                link.setAttribute('href', url)
                                link.setAttribute('download', `${fileName}.png`)
                                link.style.visibility = 'hidden'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                            }
                        }, 'image/png')
                    } else {
                        alert('Impossible de capturer le contenu pour l\'export PNG')
                    }
                }

                setShowExportMenu(false)

            } catch (error) {
                console.error('Erreur lors de l\'export:', error)
                alert('Erreur lors de l\'export des données')
            }
        }

        return (
            <div className="relative">
                <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                    <Download className="h-4 w-4" />
                    Exporter
                    <ChevronDown className="h-4 w-4" />
                </button>

                {showExportMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-2">
                            {exportOptions.map((option) => (
                                <button
                                    key={option.format}
                                    onClick={() => handleExport(option.format)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Overlay to close menu when clicking outside */}
                {showExportMenu && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowExportMenu(false)}
                    />
                )}
            </div>
        )
    }

    // Fetch ticket analytics data
    const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
        queryKey: ['ticket-analytics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/ticket-analytics/?${buildQueryParams()}`).then(res => res.data),
        enabled: (activeTab === 'tickets' || activeTab === 'technicians') && user?.role === 'admin'
    })

    // Fetch user performance data
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['user-performance', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/user-performance/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'users' && user?.role === 'admin'
    })

    // Fetch SLA tracking data
    const { data: slaData, isLoading: slaLoading } = useQuery({
        queryKey: ['sla-tracking', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/sla-tracking/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'sla' && user?.role === 'admin'
    })

    // Fetch quality metrics data
    const { data: qualityData, isLoading: qualityLoading } = useQuery({
        queryKey: ['quality-metrics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/quality-metrics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'quality' && user?.role === 'admin'
    })

    // Fetch recurring problems data
    const { data: recurringData, isLoading: recurringLoading } = useQuery({
        queryKey: ['recurring-problems', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/recurring-problems/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'recurring' && user?.role === 'admin'
    })

    // Fetch employee statistics data
    const { data: employeeData, isLoading: employeeLoading, error: employeeError } = useQuery({
        queryKey: ['employee-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/employee-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'employees' && user?.role === 'admin'
    })

    // Fetch technician statistics data
    const { data: technicianData, isLoading: technicianLoading } = useQuery({
        queryKey: ['technician-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/technician-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'technicians' && user?.role === 'admin'
    })

    // Fetch group statistics data
    const { data: groupData, isLoading: groupLoading } = useQuery({
        queryKey: ['group-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/group-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'groups' && user?.role === 'admin'
    })

    // Fetch performance statistics data
    const { data: performanceData, isLoading: performanceLoading } = useQuery({
        queryKey: ['performance-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/performance-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'performance' && user?.role === 'admin'
    })

    // Fetch trends statistics data
    const { data: trendsData, isLoading: trendsLoading } = useQuery({
        queryKey: ['trends-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/trends-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'trends' && user?.role === 'admin'
    })

    // Fetch workload statistics data
    const { data: workloadData, isLoading: workloadLoading } = useQuery({
        queryKey: ['workload-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/workload-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'workload' && user?.role === 'admin'
    })

    // Fetch system statistics data
    const { data: systemData, isLoading: systemLoading } = useQuery({
        queryKey: ['system-statistics', buildQueryParams()],
        queryFn: () => api.get(`/api/reports/system-statistics/?${buildQueryParams()}`).then(res => res.data),
        enabled: activeTab === 'system' && user?.role === 'admin'
    })

    // Fetch employees list for filter dropdown
    const { data: employeesList } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => api.get('/api/reports/employees-list/').then(res => res.data),
        enabled: user?.role === 'admin'
    })

    // Fetch technicians list for filter dropdown
    const { data: techniciansList } = useQuery({
        queryKey: ['technicians-list'],
        queryFn: () => api.get('/api/reports/technicians-list/').then(res => res.data),
        enabled: user?.role === 'admin'
    })

    // Handle query errors
    useEffect(() => {
        if (ticketError) {
            console.error('Ticket analytics error:', ticketError)
        }
        if (employeeError) {
            console.error('Employee statistics error:', employeeError)
        }
    }, [ticketError, employeeError])

    // Redirect non-admin users
    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard')
        }
    }, [user, router])

    // Show loading or access denied for non-admin users
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès Refusé</h1>
                    <p className="text-gray-600">Seuls les administrateurs peuvent accéder aux statistiques.</p>
                </div>
            </div>
        )
    }

    const renderTabContent = () => {
        const currentFilters = {
            timeFilter,
            statusFilter,
            priorityFilter,
            startDate: customStartDate,
            endDate: customEndDate
        }

        switch (activeTab) {
            case 'tickets': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Analytiques des Tickets</h2>
                        </div>

                        {ticketLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : ticketData ? (
                            <>
                                {/* Apple-inspired Glassmorphism Dashboard */}
                                <div className="relative">
                                    {/* Main Glass Container */}
                                    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
                                        {/* Glass Background Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/20 to-white/10 rounded-3xl backdrop-blur-xl"></div>

                                        {/* Content Container */}
                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                                            {/* Left Section - 4 KPI Cards in 2x2 Grid */}
                                            <div className="flex-1 grid grid-cols-2 gap-6">
                                                {/* Total des Tickets */}
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-6">
                                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Total des Tickets</h3>
                                                        <p className="text-3xl font-bold text-blue-600 mb-3">{ticketData.total_tickets}</p>
                                                        <div className="flex items-center">
                                                            {ticketData.monthly_comparisons?.total_tickets_change >= 0 ? (
                                                                <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {ticketData.monthly_comparisons?.total_tickets_change >= 0 ? '+' : ''}
                                                                {ticketData.monthly_comparisons?.total_tickets_change || 0}%
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-1">vs mois dernier</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Temps Moyen Résolution */}
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-6">
                                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Temps Moyen Résolution</h3>
                                                        <p className="text-3xl font-bold text-green-600 mb-3">{ticketData.avg_resolution_time}h</p>
                                                        <div className="flex items-center">
                                                            {ticketData.monthly_comparisons?.resolution_time_change >= 0 ? (
                                                                <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {ticketData.monthly_comparisons?.resolution_time_change >= 0 ? '+' : ''}
                                                                {ticketData.monthly_comparisons?.resolution_time_change || 0}h
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-1">vs mois dernier</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Temps Première Réponse */}
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-6">
                                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Temps Première Réponse</h3>
                                                        <p className="text-3xl font-bold text-purple-600 mb-3">{ticketData.avg_first_response_time}h</p>
                                                        <div className="flex items-center">
                                                            {ticketData.monthly_comparisons?.frt_change >= 0 ? (
                                                                <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {ticketData.monthly_comparisons?.frt_change >= 0 ? '+' : ''}
                                                                {ticketData.monthly_comparisons?.frt_change || 0}h
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-1">vs mois dernier</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Tickets par Employé */}
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-6">
                                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Tickets par Employé</h3>
                                                        <p className="text-3xl font-bold text-orange-600 mb-3">{ticketData.avg_tickets_per_employee || 0}</p>
                                                        <div className="flex items-center">
                                                            {ticketData.monthly_comparisons?.avg_tickets_per_employee_change >= 0 ? (
                                                                <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 text-red-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {ticketData.monthly_comparisons?.avg_tickets_per_employee_change >= 0 ? '+' : ''}
                                                                {ticketData.monthly_comparisons?.avg_tickets_per_employee_change || 0}%
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-1">vs mois dernier</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Section - Taux de Résolution Gauge */}
                                            <div className="lg:w-80 flex-shrink-0">
                                                <div className="relative group h-full">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-8 flex flex-col items-center justify-center h-full">
                                                        <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">Taux de Résolution</h3>
                                                        <div className="flex flex-col items-center">
                                                            <AppleGauge
                                                                value={ticketData.resolution_rate || 0}
                                                                size={160}
                                                                strokeWidth={12}
                                                                color="#34D399"
                                                                backgroundColor="rgba(156, 163, 175, 0.3)"
                                                                showPercentage={true}
                                                            />
                                                            <div className="flex items-center mt-6">
                                                                {ticketData.monthly_comparisons?.resolution_rate_change >= 0 ? (
                                                                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                )}
                                                                <span className="text-sm font-medium text-gray-800">
                                                                    {ticketData.monthly_comparisons?.resolution_rate_change >= 0 ? '+' : ''}
                                                                    {ticketData.monthly_comparisons?.resolution_rate_change || 0}% vs mois dernier
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Apple-Inspired Charts Layout */}
                                <div className="relative">
                                    {/* Main Glass Container */}
                                    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
                                        {/* Glass Background Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/20 to-white/10 rounded-3xl backdrop-blur-xl"></div>

                                        {/* Content Container */}
                                        <div className="relative z-10 flex flex-col lg:flex-row gap-8">
                                            {/* Left Section - Line Chart */}
                                            <div className="flex-1 max-w-4xl">
                                                <div className="relative group h-full">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-6 h-full">
                                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendances du Volume de Tickets</h3>
                                                        <div className="h-[580px]">
                                                            {ticketData.monthly_trends && ticketData.monthly_trends.length > 0 ? (
                                                                <Line
                                                                    data={{
                                                                        labels: ticketData.monthly_trends.map((item: any) => item.month),
                                                                        datasets: [{
                                                                            label: 'Tickets',
                                                                            data: ticketData.monthly_trends.map((item: any) => item.count),
                                                                            borderColor: '#3B82F6',
                                                                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                                            borderWidth: 3,
                                                                            pointBackgroundColor: '#3B82F6',
                                                                            pointBorderColor: '#ffffff',
                                                                            pointBorderWidth: 2,
                                                                            pointRadius: 6,
                                                                            pointHoverRadius: 8,
                                                                            tension: 0.4,
                                                                            fill: true
                                                                        }]
                                                                    }}
                                                                    options={{
                                                                        responsive: true,
                                                                        maintainAspectRatio: false,
                                                                        devicePixelRatio: 2,
                                                                        plugins: {
                                                                            legend: {
                                                                                display: false
                                                                            },
                                                                            tooltip: {
                                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                                titleColor: '#374151',
                                                                                bodyColor: '#374151',
                                                                                borderColor: '#e5e7eb',
                                                                                borderWidth: 1,
                                                                                cornerRadius: 8,
                                                                                displayColors: true,
                                                                                callbacks: {
                                                                                    label: function (context) {
                                                                                        return 'Tickets: ' + context.parsed.y;
                                                                                    }
                                                                                }
                                                                            }
                                                                        },
                                                                        scales: {
                                                                            x: {
                                                                                grid: {
                                                                                    display: true,
                                                                                    color: 'rgba(0, 0, 0, 0.1)'
                                                                                },
                                                                                ticks: {
                                                                                    color: '#6b7280',
                                                                                    font: {
                                                                                        size: 12
                                                                                    }
                                                                                }
                                                                            },
                                                                            y: {
                                                                                beginAtZero: true,
                                                                                grid: {
                                                                                    display: true,
                                                                                    color: 'rgba(0, 0, 0, 0.1)'
                                                                                },
                                                                                ticks: {
                                                                                    color: '#6b7280',
                                                                                    font: {
                                                                                        size: 12
                                                                                    },
                                                                                    stepSize: 100
                                                                                }
                                                                            }
                                                                        },
                                                                        elements: {
                                                                            point: {
                                                                                hoverBackgroundColor: '#3B82F6'
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Section - 4 Pie Charts in 2x2 Grid */}
                                            <div className="lg:w-[550px] flex-shrink-0">
                                                <div className="relative group h-full">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/30 to-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg group-hover:shadow-xl transition-all duration-300"></div>
                                                    <div className="relative p-4 h-full">
                                                        <div className="grid grid-cols-2 gap-2 h-full">
                                                            {/* Distribution by Group - Multi-ring Chart */}
                                                            <div className="relative group">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/40 to-white/30 rounded-xl backdrop-blur-sm border border-white/40 shadow-md group-hover:shadow-lg transition-all duration-300"></div>
                                                                <div className="relative p-3 flex flex-col items-center justify-center h-full">
                                                                    {userData && userData.group_distribution && userData.group_distribution.length > 0 ? (
                                                                        <AppleMultiRingChart
                                                                            data={userData.group_distribution.map((item: any) => ({
                                                                                label: item.group,
                                                                                value: item.count,
                                                                                color: item.group === 'IT' ? '#8B5CF6' :
                                                                                    item.group === 'HR' ? '#F59E0B' :
                                                                                        item.group === 'Finance' ? '#10B981' : '#EF4444'
                                                                            }))}
                                                                            title="Distribution par Groupe"
                                                                            total={userData.group_distribution.reduce((sum: number, item: any) => sum + item.count, 0)}
                                                                            totalLabel="Total Utilisateurs"
                                                                            size={200}
                                                                            strokeWidth={22}
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribution par Groupe</h3>
                                                                            <p className="text-gray-500 text-xs">Aucune donnée disponible</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Distribution by Status - Donut Chart */}
                                                            <div className="relative group">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/40 to-white/30 rounded-xl backdrop-blur-sm border border-white/40 shadow-md group-hover:shadow-lg transition-all duration-300"></div>
                                                                <div className="relative p-3 flex flex-col items-center justify-center h-full">
                                                                    {ticketData.status_distribution && ticketData.status_distribution.length > 0 ? (
                                                                        <AppleMultiRingChart
                                                                            data={ticketData.status_distribution.map((item: any) => ({
                                                                                label: item.status,
                                                                                value: item.count,
                                                                                color: item.status === 'Ouvert' ? '#F59E0B' :
                                                                                    item.status === 'En cours' ? '#EAB308' :
                                                                                        item.status === 'Fermé' ? '#10B981' : '#EF4444'
                                                                            }))}
                                                                            title="Distribution par Statut"
                                                                            total={ticketData.status_distribution.reduce((sum: number, item: any) => sum + item.count, 0)}
                                                                            totalLabel="Total Tickets"
                                                                            size={200}
                                                                            strokeWidth={16}
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribution par Statut</h3>
                                                                            <p className="text-gray-500 text-xs">Aucune donnée disponible</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Distribution by Type - Donut Chart */}
                                                            <div className="relative group">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/40 to-white/30 rounded-xl backdrop-blur-sm border border-white/40 shadow-md group-hover:shadow-lg transition-all duration-300"></div>
                                                                <div className="relative p-3 flex flex-col items-center justify-center h-full">
                                                                    {ticketData.type_distribution && ticketData.type_distribution.length > 0 ? (
                                                                        <AppleMultiRingChart
                                                                            data={ticketData.type_distribution.map((item: any) => ({
                                                                                label: item.type,
                                                                                value: item.count,
                                                                                color: item.type === 'Network' ? '#3B82F6' :
                                                                                    item.type === 'Hardware' ? '#EF4444' :
                                                                                        item.type === 'Software' ? '#10B981' :
                                                                                            item.type === 'Security' ? '#F59E0B' : '#8B5CF6'
                                                                            }))}
                                                                            title="Distribution par Type"
                                                                            total={ticketData.type_distribution.reduce((sum: number, item: any) => sum + item.count, 0)}
                                                                            totalLabel="Total Tickets"
                                                                            size={200}
                                                                            strokeWidth={16}
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribution par Type</h3>
                                                                            <p className="text-gray-500 text-xs">Aucune donnée disponible</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Distribution by Priority - Donut Chart */}
                                                            <div className="relative group">
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/40 to-white/30 rounded-xl backdrop-blur-sm border border-white/40 shadow-md group-hover:shadow-lg transition-all duration-300"></div>
                                                                <div className="relative p-3 flex flex-col items-center justify-center h-full">
                                                                    {ticketData.priority_distribution && ticketData.priority_distribution.length > 0 ? (
                                                                        <AppleMultiRingChart
                                                                            data={ticketData.priority_distribution.map((item: any) => ({
                                                                                label: item.priority,
                                                                                value: item.count,
                                                                                color: item.priority === 'P1' ? '#EF4444' :
                                                                                    item.priority === 'P2' ? '#F59E0B' :
                                                                                        item.priority === 'P3' ? '#3B82F6' : '#10B981'
                                                                            }))}
                                                                            title="Distribution par Priorité"
                                                                            total={ticketData.priority_distribution.reduce((sum: number, item: any) => sum + item.count, 0)}
                                                                            totalLabel="Total Tickets"
                                                                            size={200}
                                                                            strokeWidth={16}
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Distribution par Priorité</h3>
                                                                            <p className="text-gray-500 text-xs">Aucune donnée disponible</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Distribution des Temps de Résolution
                                                {timeFilter === 'month' && ' (Ce Mois)'}
                                                {timeFilter === 'quarter' && ' (Ce Trimestre)'}
                                                {timeFilter === 'year' && ' (Cette Année)'}
                                                {timeFilter === 'custom' && ' (Période Sélectionnée)'}
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-500">
                                                    {timeFilter === 'month' && 'Tickets fermés ce mois'}
                                                    {timeFilter === 'quarter' && 'Tickets fermés ce trimestre'}
                                                    {timeFilter === 'year' && 'Tickets fermés cette année'}
                                                    {timeFilter === 'custom' && 'Tickets fermés dans la période'}
                                                    {(timeFilter === 'today' || timeFilter === 'week' || timeFilter === 'all') && 'Tous les tickets fermés'}
                                                </span>
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="h-64">
                                            {ticketError ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <p className="text-red-500 font-medium">Erreur lors du chargement des données</p>
                                                        <p className="text-sm text-gray-500 mt-1">Vérifiez la console pour plus de détails</p>
                                                    </div>
                                                </div>
                                            ) : ticketLoading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                                        <p className="text-gray-500 mt-2">Chargement...</p>
                                                    </div>
                                                </div>
                                            ) : ticketData?.resolution_time_distribution ? (
                                                <Bar
                                                    data={{
                                                        labels: ['0-1 jour', '1-3 jours', '3-7 jours', '7-14 jours', '14+ jours'],
                                                        datasets: [{
                                                            label: 'Nombre de tickets',
                                                            data: [
                                                                ticketData.resolution_time_distribution['0-1_day'],
                                                                ticketData.resolution_time_distribution['1-3_days'],
                                                                ticketData.resolution_time_distribution['3-7_days'],
                                                                ticketData.resolution_time_distribution['7-14_days'],
                                                                ticketData.resolution_time_distribution['14+_days']
                                                            ],
                                                            backgroundColor: [
                                                                '#4ECDC4', // Apple Teal - Excellent (0-1 day)
                                                                '#45B7D1', // Apple Blue - Good (1-3 days)
                                                                '#FFB347', // Apple Orange - Average (3-7 days)
                                                                '#FF6B6B', // Apple Red - Poor (7-14 days)
                                                                '#E74C3C'  // Dark Red - Very Poor (14+ days)
                                                            ],
                                                            borderColor: [
                                                                '#26A69A', // Teal border
                                                                '#2196F3', // Blue border
                                                                '#FF9800', // Orange border
                                                                '#FF5252', // Red border
                                                                '#C62828'  // Dark red border
                                                            ],
                                                            borderWidth: 0,
                                                            borderRadius: {
                                                                topLeft: 20,
                                                                topRight: 20,
                                                                bottomLeft: 20,
                                                                bottomRight: 20
                                                            },
                                                            borderSkipped: false,
                                                        }]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        devicePixelRatio: 2,
                                                        animation: {
                                                            duration: 2000,
                                                            easing: 'easeOutQuart',
                                                            delay: (context) => context.dataIndex * 100
                                                        },
                                                        plugins: {
                                                            legend: {
                                                                display: false
                                                            },
                                                            tooltip: {
                                                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                                                titleColor: '#ffffff',
                                                                bodyColor: '#ffffff',
                                                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                                                borderWidth: 1,
                                                                cornerRadius: 12,
                                                                displayColors: false,
                                                                titleFont: {
                                                                    size: 14,
                                                                    weight: 600
                                                                },
                                                                bodyFont: {
                                                                    size: 13,
                                                                    weight: 500
                                                                },
                                                                padding: 16,
                                                                titleSpacing: 8,
                                                                bodySpacing: 4
                                                            }
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                grid: {
                                                                    color: 'rgba(0, 0, 0, 0.08)',
                                                                    // drawBorder: false,
                                                                    lineWidth: 1
                                                                },
                                                                ticks: {
                                                                    color: '#6B7280',
                                                                    font: {
                                                                        size: 12,
                                                                        weight: 500
                                                                    },
                                                                    padding: 12
                                                                },
                                                                title: {
                                                                    display: true,
                                                                    text: 'Nombre de tickets',
                                                                    color: '#374151',
                                                                    font: {
                                                                        size: 13,
                                                                        weight: 600
                                                                    }
                                                                }
                                                            },
                                                            x: {
                                                                grid: {
                                                                    display: false
                                                                },
                                                                ticks: {
                                                                    color: '#6B7280',
                                                                    font: {
                                                                        size: 11,
                                                                        weight: 500
                                                                    },
                                                                    padding: 12,
                                                                    maxRotation: 0
                                                                },
                                                                title: {
                                                                    display: true,
                                                                    text: 'Temps de résolution',
                                                                    color: '#374151',
                                                                    font: {
                                                                        size: 13,
                                                                        weight: 600
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'users': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Performance des Utilisateurs</h2>
                        </div>

                        {userLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : userData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Top Employés</h3>
                                    {userData.top_employees && userData.top_employees.length > 0 ? (
                                        <div className="space-y-2">
                                            {userData.top_employees.slice(0, 3).map((emp: any, index: number) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-sm">{emp.requester__first_name} {emp.requester__last_name}</span>
                                                    <span className="text-sm font-bold text-blue-600">{emp.tickets_created}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Top Techniciens</h3>
                                    {userData.top_technicians && userData.top_technicians.length > 0 ? (
                                        <div className="space-y-2">
                                            {userData.top_technicians.slice(0, 3).map((tech: any, index: number) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-sm">{tech.claimed_by__first_name} {tech.claimed_by__last_name}</span>
                                                    <span className="text-sm font-bold text-green-600">{tech.tickets_resolved}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Top Départements</h3>
                                    {userData.top_departments && userData.top_departments.length > 0 ? (
                                        <div className="space-y-2">
                                            {userData.top_departments.slice(0, 3).map((dept: any, index: number) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-sm">{dept.requester__group}</span>
                                                    <span className="text-sm font-bold text-purple-600">{dept.tickets_created}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'sla': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Suivi SLA</h2>
                        </div>

                        {slaLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : slaData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Conformité SLA</h3>
                                    <p className="text-3xl font-bold text-green-600">{slaData.sla_compliance_rate}%</p>
                                    <p className="text-sm text-gray-500">Dans les délais cibles</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Temps de Résolution Moyen</h3>
                                    <p className="text-3xl font-bold text-blue-600">{slaData.avg_resolution_time}h</p>
                                    <p className="text-sm text-gray-500">Temps moyen</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Violations SLA</h3>
                                    <p className="text-3xl font-bold text-red-600">{slaData.sla_breaches}</p>
                                    <p className="text-sm text-gray-500">Dépassements</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'quality': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Contrôle Qualité</h2>
                        </div>

                        {qualityLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : qualityData ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Tickets Rouverts</h3>
                                    <p className="text-3xl font-bold text-orange-600">{qualityData.reopened_tickets}</p>
                                    <p className="text-sm text-gray-500">Ce mois</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Taux de Réouverture</h3>
                                    <p className="text-3xl font-bold text-yellow-600">{qualityData.reopen_rate}%</p>
                                    <p className="text-sm text-gray-500">Des tickets fermés</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'recurring': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Problèmes Récurrents</h2>
                        </div>

                        {recurringLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : recurringData ? (
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold mb-4">Problèmes les Plus Courants</h3>
                                {recurringData.recurring_problems && recurringData.recurring_problems.length > 0 ? (
                                    <div className="space-y-4">
                                        {recurringData.recurring_problems.slice(0, 10).map((problem: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                <span className="font-medium">{problem.subject}</span>
                                                <span className="text-blue-600 font-bold">{problem.occurrences} occurrences</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">Aucun problème récurrent trouvé</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'employees': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Statistiques des Employés</h2>
                        </div>

                        {employeeLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : employeeData ? (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold mb-4">Taux de Conformité SLA</h3>
                                        <p className="text-3xl font-bold text-green-600">{employeeData.sla_on_time_rate || 0}%</p>
                                        <div className="flex items-center mt-2">
                                            {employeeData.monthly_comparisons?.sla_on_time_rate_change >= 0 ? (
                                                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <span className={`text-sm font-medium ${employeeData.monthly_comparisons?.sla_on_time_rate_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {employeeData.monthly_comparisons?.sla_on_time_rate_change >= 0 ? '+' : ''}{employeeData.monthly_comparisons?.sla_on_time_rate_change || 0}%
                                            </span>
                                            <span className="text-sm text-gray-500 ml-1 whitespace-nowrap">vs mois dernier</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold mb-4">Tickets par Heure</h3>
                                        <p className="text-3xl font-bold text-blue-600">{employeeData.tickets_per_hour || 0}</p>
                                        <div className="flex items-center mt-2">
                                            {employeeData.monthly_comparisons?.tickets_per_hour_change >= 0 ? (
                                                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <span className={`text-sm font-medium ${employeeData.monthly_comparisons?.tickets_per_hour_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {employeeData.monthly_comparisons?.tickets_per_hour_change >= 0 ? '+' : ''}{employeeData.monthly_comparisons?.tickets_per_hour_change || 0}%
                                            </span>
                                            <span className="text-sm text-gray-500 ml-1 whitespace-nowrap">vs mois dernier</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold mb-4">Temps Résolution (Moy) par Employé Créateur</h3>
                                        <p className="text-3xl font-bold text-purple-600">{employeeData.avg_resolution_by_creator || 0}h</p>
                                        <div className="flex items-center mt-2">
                                            {employeeData.monthly_comparisons?.avg_resolution_by_creator_change >= 0 ? (
                                                <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <span className={`text-sm font-medium ${employeeData.monthly_comparisons?.avg_resolution_by_creator_change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {employeeData.monthly_comparisons?.avg_resolution_by_creator_change >= 0 ? '+' : ''}{employeeData.monthly_comparisons?.avg_resolution_by_creator_change || 0}h
                                            </span>
                                            <span className="text-sm text-gray-500 ml-1 whitespace-nowrap">vs mois dernier</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold mb-4">Top Employés</h3>
                                        {employeeData.top_employees && employeeData.top_employees.length > 0 ? (
                                            <div className="overflow-hidden">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-gray-200">
                                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Nom</th>
                                                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Tickets</th>
                                                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Évolution</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {employeeData.employee_performance && employeeData.employee_performance.slice(0, 5).map((emp: any, index: number) => (
                                                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                                                <td className="py-4 px-4">
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">
                                                                            {emp.first_name} {emp.last_name}
                                                                        </div>
                                                                        <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                                                                            {emp.group}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-4 text-center">
                                                                    <span className="text-lg font-bold text-gray-900">{emp.tickets_created}</span>
                                                                </td>
                                                                <td className="py-4 px-4 text-center">
                                                                    <span className={`text-sm font-medium ${emp.evolution_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {emp.evolution_percentage >= 0 ? '+' : ''}{emp.evolution_percentage}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Aucune donnée</p>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-lg shadow">
                                        <h3 className="text-lg font-semibold mb-4">
                                            {employeeData.employee_chart_data?.chart_type === 'line' ? 'Performance des Employés' : 'Performance de l\'Employé'}
                                        </h3>
                                        {employeeData.employee_chart_data ? (
                                            <div className="h-48">
                                                {employeeData.employee_chart_data.chart_type === 'line' ? (
                                                    <Line
                                                        data={{
                                                            labels: employeeData.employee_chart_data.labels,
                                                            datasets: employeeData.employee_chart_data.datasets
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: {
                                                                    position: 'top' as const,
                                                                },
                                                                title: {
                                                                    display: false,
                                                                },
                                                            },
                                                            scales: {
                                                                y: {
                                                                    beginAtZero: true,
                                                                    grid: {
                                                                        color: 'rgba(0, 0, 0, 0.1)',
                                                                    },
                                                                },
                                                                x: {
                                                                    grid: {
                                                                        color: 'rgba(0, 0, 0, 0.1)',
                                                                    },
                                                                },
                                                            },
                                                            devicePixelRatio: 2,
                                                        }}
                                                    />
                                                ) : (
                                                    <Bar
                                                        data={{
                                                            labels: employeeData.employee_chart_data.labels,
                                                            datasets: employeeData.employee_chart_data.datasets
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: {
                                                                    position: 'top' as const,
                                                                },
                                                                title: {
                                                                    display: false,
                                                                },
                                                            },
                                                            scales: {
                                                                y: {
                                                                    beginAtZero: true,
                                                                    grid: {
                                                                        color: 'rgba(0, 0, 0, 0.1)',
                                                                    },
                                                                },
                                                                x: {
                                                                    grid: {
                                                                        color: 'rgba(0, 0, 0, 0.1)',
                                                                    },
                                                                },
                                                            },
                                                            devicePixelRatio: 2,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Aucune donnée</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                                {employeeError && (
                                    <p className="text-red-500 text-sm mt-2">
                                        {employeeError.message || 'Erreur inconnue'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            case 'technicians': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Statistiques des Techniciens</h2>
                        </div>

                        {(ticketLoading || technicianLoading) ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : ticketData ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Card 1: Le taux de résolution */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex items-center justify-center mb-4">
                                            <AppleGauge
                                                value={ticketData.resolution_rate || 0}
                                                max={100}
                                                size={120}
                                                strokeWidth={8}
                                                color="#10B981"
                                                backgroundColor="#E5E7EB"
                                                label="Taux de Résolution"
                                                showPercentage={true}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Taux de Résolution</h3>
                                            <p className="text-sm text-gray-600">Tickets résolus avec succès</p>
                                        </div>
                                    </div>

                                    {/* Card 2: Le Temps Moyen de résolution */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="relative">
                                                <AppleGauge
                                                    value={ticketData.avg_resolution_time || 0}
                                                    max={168}
                                                    size={120}
                                                    strokeWidth={8}
                                                    color="#3B82F6"
                                                    backgroundColor="#E5E7EB"
                                                    showPercentage={false}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-xl font-bold text-blue-600">
                                                        {ticketData.avg_resolution_time || 0}h
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Temps Moyen de Résolution</h3>
                                            <p className="text-sm text-gray-600">Durée moyenne de traitement</p>
                                        </div>
                                    </div>

                                    {/* Card 3: First Response Rate */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex items-center justify-center mb-4">
                                            <AppleGauge
                                                value={ticketData.avg_first_response_time ? Math.max(0, 100 - (ticketData.avg_first_response_time / 24 * 100)) : 0}
                                                max={100}
                                                size={120}
                                                strokeWidth={8}
                                                color="#F59E0B"
                                                backgroundColor="#E5E7EB"
                                                label="Taux de Réponse"
                                                showPercentage={true}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Taux de Réponse Rapide</h3>
                                            <p className="text-sm text-gray-600">Réponse dans les 24h</p>
                                        </div>
                                    </div>

                                    {/* Card 4: Reopening Rate */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex items-center justify-center mb-4">
                                            <AppleGauge
                                                value={ticketData.reopened_tickets && ticketData.total_tickets ?
                                                    Math.min(100, (ticketData.reopened_tickets / ticketData.total_tickets) * 100) : 0}
                                                max={100}
                                                size={120}
                                                strokeWidth={8}
                                                color="#EF4444"
                                                backgroundColor="#E5E7EB"
                                                label="Taux de Réouverture"
                                                showPercentage={true}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Taux de Réouverture</h3>
                                            <p className="text-sm text-gray-600">Tickets rouverts après fermeture</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Top 5 Technicians Charts */}
                                <TechnicianCharts
                                    technicianFilter={technicianFilter}
                                    timeFilter={timeFilter}
                                />
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )
                        }</div>
                )
            }

            case 'groups': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Statistiques des Groupes/Départements</h2>
                        </div>

                        {groupLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : groupData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Top Groupes/Départements</h3>
                                    {groupData.top_groups && groupData.top_groups.length > 0 ? (
                                        <div className="space-y-3">
                                            {groupData.top_groups.slice(0, 5).map((group: any, index: number) => (
                                                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <span className="font-medium">{group.requester__group}</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-purple-600">{group.tickets_created}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Performance des Groupes</h3>
                                    {groupData.group_performance && groupData.group_performance.length > 0 ? (
                                        <div className="space-y-3">
                                            {groupData.group_performance.slice(0, 5).map((group: any, index: number) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium">{group.group_name}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-500">Créés:</span>
                                                            <span className="font-bold text-blue-600 ml-1">{group.tickets_created}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Fermés:</span>
                                                            <span className="font-bold text-green-600 ml-1">{group.tickets_closed}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Temps:</span>
                                                            <span className="font-bold text-purple-600 ml-1">{group.avg_resolution_time}h</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'performance': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Statistiques de Performance (Temps de Première Réponse)</h2>
                        </div>

                        {performanceLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : performanceData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Temps de Première Réponse Moyen</h3>
                                    <p className="text-3xl font-bold text-blue-600">{performanceData.avg_frt}h</p>
                                    <p className="text-sm text-gray-500">Heures</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Tickets avec Réponse</h3>
                                    <p className="text-3xl font-bold text-green-600">{performanceData.total_tickets_with_response}</p>
                                    <p className="text-sm text-gray-500">Total</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">FRT par Priorité</h3>
                                    {performanceData.frt_by_priority && performanceData.frt_by_priority.length > 0 ? (
                                        <div className="space-y-2">
                                            {performanceData.frt_by_priority.map((item: any, index: number) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-sm">{item.priority}</span>
                                                    <span className="text-sm font-bold text-blue-600">{item.avg_frt}h</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'trends': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Tendances du Volume de Tickets</h2>
                        </div>

                        {trendsLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : trendsData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Taux de Croissance</h3>
                                    <p className="text-3xl font-bold text-blue-600">{trendsData.growth_rate}%</p>
                                    <p className="text-sm text-gray-500">Derniers 30 jours</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Volume par Type</h3>
                                    {trendsData.volume_by_type && trendsData.volume_by_type.length > 0 ? (
                                        <div className="space-y-2">
                                            {trendsData.volume_by_type.map((item: any, index: number) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-sm">{item.type}</span>
                                                    <span className="text-sm font-bold text-blue-600">{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'workload': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Analyse de la Charge de Travail</h2>
                        </div>

                        {workloadLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : workloadData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Tickets Actifs</h3>
                                    <p className="text-3xl font-bold text-orange-600">{workloadData.total_active_tickets}</p>
                                    <p className="text-sm text-gray-500">En cours</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Distribution de la Charge</h3>
                                    {workloadData.workload_distribution ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm">Sous-capacité</span>
                                                <span className="text-sm font-bold text-green-600">{workloadData.workload_distribution.under_capacity}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Capacité normale</span>
                                                <span className="text-sm font-bold text-blue-600">{workloadData.workload_distribution.normal_capacity}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Sur-capacité</span>
                                                <span className="text-sm font-bold text-red-600">{workloadData.workload_distribution.over_capacity}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Alertes de Surcharge</h3>
                                    {workloadData.overload_alerts && workloadData.overload_alerts.length > 0 ? (
                                        <div className="space-y-2">
                                            {workloadData.overload_alerts.slice(0, 3).map((alert: any, index: number) => (
                                                <div key={index} className="p-2 bg-red-50 rounded-lg">
                                                    <span className="text-sm font-medium">{alert.first_name} {alert.last_name}</span>
                                                    <p className="text-xs text-red-600">{alert.active_tickets} tickets actifs</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune alerte</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            case 'system': {
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Performance du Système</h2>
                        </div>

                        {systemLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : systemData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Temps de Réponse</h3>
                                    <p className="text-3xl font-bold text-blue-600">150ms</p>
                                    <p className="text-sm text-gray-500">Moyenne</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Disponibilité</h3>
                                    <p className="text-3xl font-bold text-green-600">{systemData.uptime_percentage}%</p>
                                    <p className="text-sm text-gray-500">Uptime</p>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold mb-4">Santé du Système</h3>
                                    {systemData.system_health ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm">Global</span>
                                                <span className="text-sm font-bold text-green-600">{systemData.system_health.overall_health}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">Base de données</span>
                                                <span className="text-sm font-bold text-blue-600">{systemData.system_health.database_health}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm">API</span>
                                                <span className="text-sm font-bold text-purple-600">{systemData.system_health.api_health}%</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">Aucune donnée</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Erreur lors du chargement des données</p>
                            </div>
                        )}
                    </div>
                )
            }

            default:
                return (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Sélectionnez une catégorie de statistiques pour voir les données</p>
                    </div>
                )
        }
    }

    return (
        <DashboardLayout>
            <div className="w-full px-1 sm:px-2 lg:px-3 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord des Statistiques</h1>
                            <p className="text-gray-600 mt-2">Analyses et insights complets pour votre système de tickets</p>
                        </div>
                        <ExportButtons />
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm mb-8">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
                        </div>
                        <ChevronDown
                            className={`h-5 w-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showFilters && (
                        <div className="px-6 pb-6 border-t border-gray-200">
                            <div className="pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                                        <select
                                            value={timeFilter}
                                            onChange={(e) => {
                                                setTimeFilter(e.target.value)
                                                if (e.target.value === 'custom') {
                                                    setShowCustomDatePicker(true)
                                                } else {
                                                    setShowCustomDatePicker(false)
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous les Temps</option>
                                            <option value="today">Aujourd'hui</option>
                                            <option value="week">Cette Semaine</option>
                                            <option value="month">Ce Mois</option>
                                            <option value="quarter">Ce Trimestre</option>
                                            <option value="year">Cette Année</option>
                                            <option value="custom">Période Personnalisée</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous les Statuts</option>
                                            <option value="open">Ouvert</option>
                                            <option value="in_progress">En cours</option>
                                            <option value="closed">Fermé</option>
                                            <option value="reopened">Rouvert</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                                        <select
                                            value={priorityFilter}
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Toutes les Priorités</option>
                                            <option value="P1">P1 - Plus Haute</option>
                                            <option value="P2">P2 - Haute</option>
                                            <option value="P3">P3 - Moyenne</option>
                                            <option value="P4">P4 - Faible</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="all">Tous les Types</option>
                                            <option value="Network">Réseau</option>
                                            <option value="Hardware">Matériel</option>
                                            <option value="Software">Logiciel</option>
                                        </select>
                                    </div>

                                    {/* Employee filter - only show for employee statistics */}
                                    {activeTab === 'employees' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Employé</label>
                                            <select
                                                value={userFilter}
                                                onChange={(e) => {
                                                    setUserFilter(e.target.value)
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">Tous les Employés</option>
                                                {employeesList?.employees?.map((employee: any) => (
                                                    <option key={employee.id} value={employee.id}>
                                                        {employee.first_name} {employee.last_name} ({employee.group})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Technician filter - only show for technician statistics */}
                                    {activeTab === 'technicians' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Technicien</label>
                                            <select
                                                value={technicianFilter}
                                                onChange={(e) => {
                                                    setTechnicianFilter(e.target.value)
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">Tous les Techniciens</option>
                                                {techniciansList?.technicians?.map((technician: any) => (
                                                    <option key={technician.id} value={technician.id}>
                                                        {technician.first_name} {technician.last_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Group filter - only show for groups section */}
                                    {activeTab === 'groups' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Groupe/Département</label>
                                            <select
                                                value={groupFilter}
                                                onChange={(e) => setGroupFilter(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="all">Tous les Groupes</option>
                                                <option value="Director">Directeur</option>
                                                <option value="Manager">Manager</option>
                                                <option value="HR">RH</option>
                                                <option value="Supervisor">Superviseur</option>
                                                <option value="Employee">Employé</option>
                                                <option value="Intern">Stagiaire</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
                                        <button
                                            onClick={() => {
                                                setTimeFilter('all')
                                                setStatusFilter('all')
                                                setPriorityFilter('all')
                                                setTypeFilter('all')
                                                setUserFilter('all')
                                                setTechnicianFilter('all')
                                                setGroupFilter('all')
                                                setCustomStartDate('')
                                                setCustomEndDate('')
                                                setShowCustomDatePicker(false)
                                            }}
                                            className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                                        >
                                            Réinitialiser
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Date Picker */}
                                {showCustomDatePicker && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Sélectionner la période personnalisée</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                                                <input
                                                    type="date"
                                                    value={customStartDate}
                                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                                                <input
                                                    type="date"
                                                    value={customEndDate}
                                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    min={customStartDate || undefined}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6 overflow-x-auto scrollbar-hide" aria-label="Statistics Tabs">
                            {navigationTabs.map((tab) => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id || (tab.subTabs && tab.subTabs.some(subTab => activeTab === subTab.id))

                                return (
                                    <div key={tab.id} className="relative">
                                        <button
                                            onClick={() => {
                                                if (tab.subTabs) {
                                                    setActiveTab(tab.subTabs[0].id)
                                                    setActiveSubTab(tab.subTabs[0].id)
                                                } else {
                                                    setActiveTab(tab.id)
                                                    setActiveSubTab(null)
                                                }
                                            }}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap flex-shrink-0 ${isActive
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                        </button>

                                    </div>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Sub-navigation for Utilisateurs */}
                {(activeTab === 'employees' || activeTab === 'technicians' || activeTab === 'groups') && (
                    <div className="bg-white rounded-lg shadow-sm mb-8">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6 overflow-x-auto scrollbar-hide" aria-label="User Statistics Sub-tabs">
                                {navigationTabs.find(tab => tab.id === 'users')?.subTabs?.map((subTab) => {
                                    const SubIcon = subTab.icon
                                    return (
                                        <button
                                            key={subTab.id}
                                            onClick={() => {
                                                setActiveTab(subTab.id)
                                                setActiveSubTab(subTab.id)
                                            }}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === subTab.id
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <SubIcon className="h-4 w-4" />
                                            {subTab.label}
                                        </button>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}