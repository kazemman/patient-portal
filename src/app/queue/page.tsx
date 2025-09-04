"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { AppLayout } from '@/components/AppLayout'
import { 
  Clock, 
  Users, 
  Activity, 
  ArrowUp, 
  ArrowDown, 
  UserCheck, 
  MapPin, 
  Search, 
  Filter, 
  RefreshCw,
  Phone,
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Stethoscope,
  Building2,
  Calendar,
  TrendingUp,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  User,
  UserPlus
} from 'lucide-react'
import { z } from 'zod'

// Types
interface QueueEntry {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  appointmentType: string
  priority: 'urgent' | 'normal' | 'low'
  status: 'waiting' | 'called' | 'in-progress' | 'completed' | 'no-show'
  providerId?: string
  providerName?: string
  roomId?: string
  roomName?: string
  estimatedWaitTime: number
  actualWaitTime?: number
  checkInTime: string
  calledTime?: string
  completedTime?: string
  notes?: string
  isWalkIn: boolean
  department: string
}

interface Provider {
  id: string
  name: string
  department: string
  specialty: string
  currentPatients: number
  maxPatients: number
  isActive: boolean
  roomIds: string[]
}

interface Room {
  id: string
  name: string
  department: string
  isOccupied: boolean
  currentPatientId?: string
}

interface QueueMetrics {
  totalPatients: number
  averageWaitTime: number
  completedToday: number
  currentlyWaiting: number
  noShowRate: number
  throughputRate: number
}

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['waiting', 'called', 'in-progress', 'completed', 'no-show']),
  notes: z.string().optional(),
  providerId: z.string().optional(),
  roomId: z.string().optional()
})

const addNotesSchema = z.object({
  notes: z.string().min(1, 'Notes cannot be empty')
})

export default function QueueManagementPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  // State
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [metrics, setMetrics] = useState<QueueMetrics>({
    totalPatients: 0,
    averageWaitTime: 0,
    completedToday: 0,
    currentlyWaiting: 0,
    noShowRate: 0,
    throughputRate: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'timeline'>('cards')
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddNotesOpen, setIsAddNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Authentication check
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login')
    }
  }, [session, isPending, router])

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    if (!showLoading) setRefreshing(true)

    try {
      const token = localStorage.getItem('bearer_token')
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [queueRes, providersRes, roomsRes, metricsRes] = await Promise.all([
        fetch('/api/clinic/queue', { headers }),
        fetch('/api/clinic/staff', { headers }),
        fetch('/api/clinic/rooms', { headers }),
        fetch('/api/clinic/queue/metrics', { headers })
      ])

      if (!queueRes.ok || !providersRes.ok || !roomsRes.ok || !metricsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [queueData, providersData, roomsData, metricsData] = await Promise.all([
        queueRes.json(),
        providersRes.json(),
        roomsRes.json(),
        metricsRes.json()
      ])

      setQueueEntries(queueData.queue || [])
      setProviders(providersData.providers || [])
      setRooms(roomsData.rooms || [])
      setMetrics(metricsData.metrics || metrics)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load queue data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [metrics])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchData(false)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  // Initial load
  useEffect(() => {
    if (session?.user) {
      fetchData()
    }
  }, [session, fetchData])

  // Queue operations
  const updatePatientStatus = async (entryId: string, status: QueueEntry['status'], providerId?: string, roomId?: string, notes?: string) => {
    try {
      const token = localStorage.getItem('bearer_token')
      const response = await fetch(`/api/clinic/queue/${entryId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, providerId, roomId, notes })
      })

      if (!response.ok) throw new Error('Failed to update status')

      await fetchData(false)
      toast.success('Patient status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update patient status')
    }
  }

  const movePatient = async (entryId: string, direction: 'up' | 'down') => {
    try {
      const token = localStorage.getItem('bearer_token')
      const response = await fetch(`/api/clinic/queue/${entryId}/move`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction })
      })

      if (!response.ok) throw new Error('Failed to move patient')

      await fetchData(false)
      toast.success(`Patient moved ${direction} in queue`)
    } catch (error) {
      console.error('Error moving patient:', error)
      toast.error('Failed to move patient')
    }
  }

  const callNextPatient = async (departmentId?: string) => {
    try {
      const token = localStorage.getItem('bearer_token')
      const response = await fetch('/api/clinic/queue/call-next', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ departmentId })
      })

      if (!response.ok) throw new Error('Failed to call next patient')

      const data = await response.json()
      await fetchData(false)
      toast.success(`Called ${data.patientName} to ${data.roomName || 'waiting area'}`)
    } catch (error) {
      console.error('Error calling next patient:', error)
      toast.error('Failed to call next patient')
    }
  }

  const addNotes = async (entryId: string, notes: string) => {
    try {
      const validation = addNotesSchema.parse({ notes })
      
      const token = localStorage.getItem('bearer_token')
      const response = await fetch(`/api/clinic/queue/${entryId}/notes`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: validation.notes })
      })

      if (!response.ok) throw new Error('Failed to add notes')

      await fetchData(false)
      setIsAddNotesOpen(false)
      setNotes('')
      toast.success('Notes added successfully')
    } catch (error) {
      console.error('Error adding notes:', error)
      toast.error('Failed to add notes')
    }
  }

  const removeFromQueue = async (entryId: string) => {
    try {
      const token = localStorage.getItem('bearer_token')
      const response = await fetch(`/api/clinic/queue/${entryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to remove patient')

      await fetchData(false)
      toast.success('Patient removed from queue')
    } catch (error) {
      console.error('Error removing patient:', error)
      toast.error('Failed to remove patient from queue')
    }
  }

  // Filter queue entries
  const filteredEntries = queueEntries.filter(entry => {
    const matchesSearch = entry.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.patientPhone.includes(searchTerm) ||
                         entry.appointmentType.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
    const matchesDepartment = departmentFilter === 'all' || entry.department === departmentFilter
    const matchesPriority = priorityFilter === 'all' || entry.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesDepartment && matchesPriority
  })

  // Get status color
  const getStatusColor = (status: QueueEntry['status']) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'called': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'in-progress': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'no-show': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getPriorityColor = (priority: QueueEntry['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <AppLayout isPatientPortal={false}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Queue Management</h1>
            <p className="text-muted-foreground">Manage patient queue and workflow</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="h-4 w-4 mr-2" />
              Auto Refresh
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Waiting</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.currentlyWaiting}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Wait Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatWaitTime(metrics.averageWaitTime)}</div>
              <p className="text-xs text-muted-foreground">
                -5m from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Show Rate</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.noShowRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                -2% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="called">Called</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="dermatology">Dermatology</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => callNextPatient()}>
              <UserCheck className="h-4 w-4 mr-2" />
              Call Next
            </Button>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
              <TabsList>
                <TabsTrigger value="cards">Cards</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Queue Content */}
        <Tabs value={viewMode} className="space-y-4">
          {/* Cards View */}
          <TabsContent value="cards" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{entry.patientName}</CardTitle>
                        <CardDescription>{entry.appointmentType}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={getPriorityColor(entry.priority)}>
                          {entry.priority}
                        </Badge>
                        {entry.isWalkIn && (
                          <Badge variant="outline" className="text-xs">Walk-in</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Wait: {formatWaitTime(entry.estimatedWaitTime)}
                      </span>
                    </div>
                    
                    {entry.providerName && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Stethoscope className="h-4 w-4" />
                        <span>{entry.providerName}</span>
                      </div>
                    )}
                    
                    {entry.roomName && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{entry.roomName}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Check-in: {new Date(entry.checkInTime).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => movePatient(entry.id, 'up')}
                          disabled={entry.status !== 'waiting'}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => movePatient(entry.id, 'down')}
                          disabled={entry.status !== 'waiting'}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(entry)
                            setIsDetailsOpen(true)
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Select
                          value={entry.status}
                          onValueChange={(value) => updatePatientStatus(entry.id, value as QueueEntry['status'])}
                        >
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="called">Called</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="no-show">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Wait Time</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.patientName}</div>
                            <div className="text-sm text-muted-foreground">{entry.patientPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{entry.appointmentType}</div>
                            {entry.isWalkIn && (
                              <Badge variant="outline" className="text-xs mt-1">Walk-in</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(entry.priority)}>
                            {entry.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.providerName || '-'}</TableCell>
                        <TableCell>{entry.roomName || '-'}</TableCell>
                        <TableCell>{formatWaitTime(entry.estimatedWaitTime)}</TableCell>
                        <TableCell>{new Date(entry.checkInTime).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => movePatient(entry.id, 'up')}
                              disabled={entry.status !== 'waiting'}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => movePatient(entry.id, 'down')}
                              disabled={entry.status !== 'waiting'}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEntry(entry)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline View */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Queue Timeline</CardTitle>
                <CardDescription>Patient flow throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredEntries.map((entry, index) => (
                      <div key={entry.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          {index < filteredEntries.length - 1 && (
                            <div className="w-px h-16 bg-border mx-auto mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{entry.patientName}</h4>
                              <p className="text-sm text-muted-foreground">{entry.appointmentType}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(entry.priority)}>
                                {entry.priority}
                              </Badge>
                              <Badge className={getStatusColor(entry.status)}>
                                {entry.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Check-in: {new Date(entry.checkInTime).toLocaleTimeString()}</span>
                            <span>Wait: {formatWaitTime(entry.estimatedWaitTime)}</span>
                            {entry.providerName && <span>Provider: {entry.providerName}</span>}
                            {entry.roomName && <span>Room: {entry.roomName}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Patient Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Patient Details</DialogTitle>
              <DialogDescription>
                View and manage patient information
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Patient Name</Label>
                    <p className="text-sm">{selectedEntry.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm">{selectedEntry.patientPhone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Appointment Type</Label>
                    <p className="text-sm">{selectedEntry.appointmentType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Department</Label>
                    <p className="text-sm">{selectedEntry.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge className={getPriorityColor(selectedEntry.priority)}>
                      {selectedEntry.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedEntry.status)}>
                      {selectedEntry.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Provider</Label>
                    <p className="text-sm">{selectedEntry.providerName || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Room</Label>
                    <p className="text-sm">{selectedEntry.roomName || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Check-in Time</Label>
                    <p className="text-sm">{new Date(selectedEntry.checkInTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Estimated Wait</Label>
                    <p className="text-sm">{formatWaitTime(selectedEntry.estimatedWaitTime)}</p>
                  </div>
                </div>
                
                {selectedEntry.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedEntry.notes}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEntry(selectedEntry)
                        setIsAddNotesOpen(true)
                        setIsDetailsOpen(false)
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // SMS notification functionality
                        toast.success('SMS notification sent')
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send SMS
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedEntry.status}
                      onValueChange={(value) => {
                        updatePatientStatus(selectedEntry.id, value as QueueEntry['status'])
                        setIsDetailsOpen(false)
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="called">Called</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="no-show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        removeFromQueue(selectedEntry.id)
                        setIsDetailsOpen(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Notes Modal */}
        <Dialog open={isAddNotesOpen} onOpenChange={setIsAddNotesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Notes</DialogTitle>
              <DialogDescription>
                Add notes for {selectedEntry?.patientName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    if (selectedEntry) {
                      addNotes(selectedEntry.id, notes)
                    }
                  }}
                  disabled={!notes.trim()}
                >
                  Add Notes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddNotesOpen(false)
                    setNotes('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}