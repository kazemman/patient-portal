"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  UserPlus,
  CalendarPlus,
  Activity,
  BarChart3,
  Shield,
  FileText,
  AlertCircle,
  TrendingUp,
  Building2,
  Stethoscope,
  ClipboardCheck
} from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  waitingPatients: number;
  completedToday: number;
  staffOnDuty: number;
  checkinsToday: number;
  averageWaitTime: number;
  departmentStats: Array<{
    departmentId: number;
    departmentName: string;
    appointmentCount: number;
  }>;
  date: string;
  timestamp: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor?: string;
  description?: string;
  trend?: string;
}

const StatCard = ({ title, value, icon, iconColor = "text-primary", description, trend }: StatCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-secondary ${iconColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline";
}

const QuickAction = ({ title, description, icon, onClick, variant = "outline" }: QuickActionProps) => {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-105" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchDashboardStats();
      
      // Refresh stats every 5 minutes
      const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const quickActions = [
    {
      title: "Register New Patient",
      description: "Add a new patient to the system",
      icon: <UserPlus className="w-5 h-5" />,
      onClick: () => router.push("/patients/new")
    },
    {
      title: "Schedule Appointment",
      description: "Book a new appointment",
      icon: <CalendarPlus className="w-5 h-5" />,
      onClick: () => router.push("/appointments/new")
    },
    {
      title: "Patient Check-In",
      description: "Check in patients for appointments",
      icon: <ClipboardCheck className="w-5 h-5" />,
      onClick: () => router.push("/checkin")
    },
    {
      title: "Manage Queue",
      description: "View and manage patient queue",
      icon: <Activity className="w-5 h-5" />,
      onClick: () => router.push("/queue")
    },
    {
      title: "View Analytics",
      description: "Clinic performance analytics",
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => router.push("/analytics")
    },
    {
      title: "Audit Logs",
      description: "System activity and audit trail",
      icon: <Shield className="w-5 h-5" />,
      onClick: () => router.push("/audit-logs")
    }
  ];

  if (isPending || loading) {
    return (
      <AppLayout isPatientPortal={false} clinicStats={undefined}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-2">Welcome to InvoTech Health Care clinic management</p>
          </div>

          {/* Loading skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-12 w-12 rounded-full mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout isPatientPortal={false} clinicStats={undefined}>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Dashboard Error</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchDashboardStats} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <AppLayout 
      isPatientPortal={false} 
      clinicStats={{
        totalPatients: stats.totalPatients,
        todayAppointments: stats.todayAppointments,
        waitingPatients: stats.waitingPatients,
        completedToday: stats.completedToday
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here's what's happening at your clinic today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDashboardStats}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={<Users className="w-5 h-5" />}
            iconColor="text-blue-600"
            description="Active patients in system"
          />
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={<Calendar className="w-5 h-5" />}
            iconColor="text-green-600"
            description="Scheduled for today"
          />
          <StatCard
            title="Waiting Patients"
            value={stats.waitingPatients}
            icon={<Clock className="w-5 h-5" />}
            iconColor="text-amber-600"
            description="Currently in queue"
          />
          <StatCard
            title="Completed Today"
            value={stats.completedToday}
            icon={<CheckCircle className="w-5 h-5" />}
            iconColor="text-emerald-600"
            description="Appointments finished"
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Staff On Duty"
            value={stats.staffOnDuty}
            icon={<Stethoscope className="w-5 h-5" />}
            iconColor="text-purple-600"
            description="Active staff members"
          />
          <StatCard
            title="Check-ins Today"
            value={stats.checkinsToday}
            icon={<ClipboardCheck className="w-5 h-5" />}
            iconColor="text-indigo-600"
            description="Patients checked in"
          />
          <StatCard
            title="Avg Wait Time"
            value={`${stats.averageWaitTime}m`}
            icon={<Activity className="w-5 h-5" />}
            iconColor="text-orange-600"
            description="Average patient wait"
          />
          <StatCard
            title="Departments"
            value={stats.departmentStats.length}
            icon={<Building2 className="w-5 h-5" />}
            iconColor="text-cyan-600"
            description="Active departments"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onClick={action.onClick}
              />
            ))}
          </div>
        </div>

        {/* Department Activity */}
        {stats.departmentStats.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Today's Department Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.departmentStats.map((dept) => (
                <Card key={dept.departmentId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{dept.departmentName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{dept.appointmentCount}</span>
                      <span className="text-sm text-muted-foreground">appointments</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Alert */}
        {stats.waitingPatients > 5 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">High Queue Volume</p>
                  <p className="text-sm text-amber-700">
                    {stats.waitingPatients} patients are currently waiting. Consider optimizing the queue flow.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push("/queue")}
                  className="ml-auto"
                >
                  Manage Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}