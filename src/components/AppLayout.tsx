import React from 'react'
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react'

interface ClinicStats {
  totalPatients: number
  todayAppointments: number
  waitingPatients: number
  completedToday: number
}

interface AppLayoutProps {
  clinicStats: ClinicStats
  children: React.ReactNode
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  iconColor?: string
}

const StatCard = ({ title, value, icon, iconColor = "text-primary" }: StatCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-full bg-secondary ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export const AppLayout = ({ clinicStats, children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation with Stats */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Clinic Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Clinic Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time overview of your clinic operations
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Patients"
              value={clinicStats.totalPatients}
              icon={<Users className="w-6 h-6" />}
              iconColor="text-blue-600"
            />
            <StatCard
              title="Today's Appointments"
              value={clinicStats.todayAppointments}
              icon={<Calendar className="w-6 h-6" />}
              iconColor="text-green-600"
            />
            <StatCard
              title="Waiting Patients"
              value={clinicStats.waitingPatients}
              icon={<Clock className="w-6 h-6" />}
              iconColor="text-amber-600"
            />
            <StatCard
              title="Completed Today"
              value={clinicStats.completedToday}
              icon={<CheckCircle className="w-6 h-6" />}
              iconColor="text-emerald-600"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}