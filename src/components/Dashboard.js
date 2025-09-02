"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  RefreshCcwDot, 
  Clock, 
  Calendar, 
  SquareActivity, 
  Gauge,
  ChartColumnBig,
  TrendingUp,
  TrendingDown,
  Users,
  UserX,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsDashboard } from '@/components/Analytics';

export default function Dashboard({ onNavigateToPatient }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/src/app/webhook/clinic-portal/stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
      toast.error('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  const handlePrintSnapshot = useCallback(() => {
    window.print();
  }, []);

  const handleAppointmentClick = useCallback((patientId) => {
    if (onNavigateToPatient) {
      onNavigateToPatient(patientId);
    }
  }, [onNavigateToPatient]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, refreshInterval]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, isLoading, trend }) => (
    <Card className="bg-card hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value}</p>
              )}
            </div>
          </div>
          {!isLoading && (change !== undefined || trend) && (
            <div className="flex flex-col items-end space-y-1">
              {change !== undefined && (
                <div className={`text-xs font-medium flex items-center ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {change >= 0 ? '+' : ''}{change}%
                </div>
              )}
              {trend && (
                <div className="text-xs text-muted-foreground">
                  {trend}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const OverviewDashboard = () => (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-destructive text-sm">
                Error loading dashboard data: {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          title="Appointments Today"
          value={stats?.appointmentsToday || 0}
          change={stats?.appointmentsTodayChange}
          isLoading={loading}
          trend="Today's schedule"
        />
        <StatCard
          icon={Users}
          title="Total Patients"
          value={stats?.totalPatients || 0}
          change={stats?.totalPatientsChange}
          isLoading={loading}
          trend="Active database"
        />
        <StatCard
          icon={CheckCircle}
          title="Today's Visits"
          value={stats?.todayPatients || 0}
          change={stats?.todayPatientsChange}
          isLoading={loading}
          trend="Patients seen"
        />
        <StatCard
          icon={SquareActivity}
          title="New Registrations"
          value={stats?.newRegistrations || 0}
          change={stats?.newRegistrationsChange}
          isLoading={loading}
          trend="This month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Upcoming Appointments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentActivity?.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.slice(0, 5).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => handleAppointmentClick(appointment.patientId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAppointmentClick(appointment.patientId);
                      }
                    }}
                    aria-label={`Appointment with ${appointment.patientName}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {appointment.patientName?.split(' ').map(n => n[0]).join('') || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {appointment.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.appointmentDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(appointment.status)}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent appointments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Summary */}
        <Card className="bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <SquareActivity className="h-5 w-5 text-primary" />
              <span>Quick Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Upcoming Appointments</span>
                </div>
                <Badge variant="secondary">{stats?.upcomingAppointments || 0}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <UserX className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">This Week's No-shows</span>
                </div>
                <Badge variant="outline" className="text-red-600 border-red-200">TBD</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completion Rate</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">TBD</Badge>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={() => setActiveTab('analytics')} 
                  className="w-full flex items-center space-x-2"
                  variant="outline"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Detailed Analytics</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen print:p-0 print:bg-white">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time clinic overview and comprehensive analytics
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCcwDot className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintSnapshot}
            className="flex items-center space-x-2"
          >
            <span>Print Snapshot</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          .print\\:break-after-page {
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}