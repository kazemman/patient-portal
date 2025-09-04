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
  Heart,
  Pill,
  CreditCard,
  User,
  BarChart3,
  Shield,
  UsersRound,
  ClipboardCheck
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
  clinicStats?: ClinicStats // Made optional
  children: React.ReactNode
  isPatientPortal?: boolean // New prop to determine layout type
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

// Navigation items for clinic portal (staff)
const clinicNavigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
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
    icon: ClipboardCheck,
  },
  {
    title: "Queue",
    url: "/queue",
    icon: Activity,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Staff Management",
    url: "/staff",
    icon: UsersRound,
  },
  {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: Shield,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

// Navigation items for patient portal
const patientNavigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Appointments",
    url: "/appointments",
    icon: Calendar,
  },
  {
    title: "Medical Records",
    url: "/records",
    icon: FileText,
  },
  {
    title: "Prescriptions",
    url: "/prescriptions",
    icon: Pill,
  },
  {
    title: "Bills & Payments",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "My Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export const AppLayout = ({ clinicStats, children, isPatientPortal = true }: AppLayoutProps) => {
  const pathname = usePathname()
  const navigationItems = isPatientPortal ? patientNavigationItems : clinicNavigationItems

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-4 py-2">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1756993698483-m835t4w714e.png" 
                alt="InvoTech Health Care Logo" 
                className="h-8 w-8 rounded-lg object-cover"
              />
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
          {/* Top Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 px-6 py-4">
              <SidebarTrigger className="mr-2" />
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-foreground">
                  {isPatientPortal ? "Patient Portal" : "Staff Portal"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isPatientPortal ? "InvoTech patient healthcare portal" : "InvoTech clinic management system"}
                </p>
              </div>
            </div>

            {/* Statistics Grid - Only show for clinic staff */}
            {!isPatientPortal && clinicStats && (
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
            )}
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