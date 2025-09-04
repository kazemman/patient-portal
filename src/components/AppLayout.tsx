import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  LayoutDashboard,
  UserPlus,
  CalendarCheck,
  Activity,
  Settings,
  FileText,
  Heart
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-2 rounded-full bg-secondary ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Navigation items for clinic portal
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    url: "/patients",
    icon: Users,
  },
  {
    title: "Appointments",
    url: "/appointments", 
    icon: Calendar,
  },
  {
    title: "Check-In",
    url: "/checkin",
    icon: UserPlus,
  },
  {
    title: "Queue",
    url: "/queue",
    icon: Activity,
  },
  {
    title: "Records",
    url: "/records",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export const AppLayout = ({ clinicStats, children }: AppLayoutProps) => {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  InvoTech
                </span>
                <span className="text-xs text-sidebar-foreground/70">
                  Health Care
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <div className="text-xs text-sidebar-foreground/70">
              © 2024 InvoTech Health Care
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          {/* Top Header with Stats */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 px-6 py-4">
              <SidebarTrigger className="mr-2" />
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-foreground">
                  Staff Portal
                </h1>
                <p className="text-sm text-muted-foreground">
                  InvoTech clinic management system
                </p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  title="Total Patients"
                  value={clinicStats.totalPatients}
                  icon={<Users className="w-4 h-4" />}
                  iconColor="text-blue-600"
                />
                <StatCard
                  title="Today's Appointments"
                  value={clinicStats.todayAppointments}
                  icon={<Calendar className="w-4 h-4" />}
                  iconColor="text-green-600"
                />
                <StatCard
                  title="Waiting Patients"
                  value={clinicStats.waitingPatients}
                  icon={<Clock className="w-4 h-4" />}
                  iconColor="text-amber-600"
                />
                <StatCard
                  title="Completed Today"
                  value={clinicStats.completedToday}
                  icon={<CheckCircle className="w-4 h-4" />}
                  iconColor="text-emerald-600"
                />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 px-6 py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}