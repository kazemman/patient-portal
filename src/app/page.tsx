'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'

interface ClinicStats {
  totalPatients: number
  todayAppointments: number
  waitingPatients: number
  completedToday: number
}

export default function Home() {
  const [clinicStats, setClinicStats] = useState<ClinicStats>({
    totalPatients: 0,
    todayAppointments: 0,
    waitingPatients: 0,
    completedToday: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchClinicStats = async () => {
    try {
      const response = await fetch('/api/webhook/clinic-portal/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setClinicStats(data)
      } else {
        console.error('Failed to fetch clinic stats')
      }
    } catch (error) {
      console.error('Error fetching clinic stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchClinicStats()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchClinicStats, 30000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading clinic dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout clinicStats={clinicStats}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Welcome to Your Clinic Dashboard
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Monitor your clinic's daily operations, track patient appointments, 
            manage check-ins, and view real-time statistics all in one place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Patient Management
            </h3>
            <p className="text-muted-foreground mb-4">
              Add new patients, view patient records, and manage patient information.
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
              Manage Patients
            </button>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Appointments
            </h3>
            <p className="text-muted-foreground mb-4">
              Schedule appointments, view today's schedule, and manage bookings.
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
              View Schedule
            </button>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Patient Check-In
            </h3>
            <p className="text-muted-foreground mb-4">
              Quick check-in for walk-in patients and appointment arrivals.
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
              Check-In Patient
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                System Status: Operational
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                All systems are running normally. Statistics update every 30 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}