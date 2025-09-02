"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  UserX, 
  Activity,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Type definitions
interface DashboardStats {
  todayPatients: number;
  newRegistrations: number;
  totalPatients: number;
  appointmentsToday: number;
  upcomingAppointments: number;
  recentActivity: Array<{
    id: number;
    patientName: string;
    appointmentDate: string;
    status: string;
    reason: string;
  }>;
}

interface AppointmentData {
  date: string;
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

interface PatientVisitsData {
  period: string;
  completedVisits: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    change: string;
  };
  visitsByPeriod: Array<{
    period: string;
    visits: number;
    uniquePatients: number;
  }>;
  topPatients: Array<{
    patientId: number;
    name: string;
    visitCount: number;
    lastVisit: string;
  }>;
  completionRate: {
    scheduled: number;
    completed: number;
    rate: string;
  };
}

interface NoShowCancellationData {
  period: string;
  noShows: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    rate: string;
    trend: string;
  };
  cancellations: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    rate: string;
    trend: string;
  };
  byPeriod: Array<{
    period: string;
    scheduled: number;
    noShows: number;
    cancelled: number;
    noShowRate: string;
    cancellationRate: string;
  }>;
  problemPatients: Array<{
    patientId: number;
    name: string;
    noShows: number;
    cancellations: number;
    totalMissed: number;
  }>;
  trends: {
    noShowTrend: string;
    cancellationTrend: string;
  };
}

interface PatientGrowthData {
  period: string;
  currentStats: {
    totalPatients: number;
    activePatients: number;
    inactivePatients: number;
    newThisMonth: number;
    newLastMonth: number;
  };
  growthByPeriod: Array<{
    period: string;
    newRegistrations: number;
    cumulativeTotal: number;
    growthRate: string;
  }>;
  trends: {
    monthlyGrowthRate: string;
    quarterlyGrowthRate: string;
    yearlyGrowthRate: string;
    trend: string;
  };
  registrationSources: Array<{
    source: string;
    count: number;
    percentage: string;
  }>;
}

interface AnalyticsDashboardData {
  period: string;
  data: AppointmentData[];
  summary: {
    totalAppointments: number;
    avgPerDay: number;
    previousPeriodChange: string;
  };
}

// Chart colors
const CHART_COLORS = {
  scheduled: '#6aa8ff',
  completed: '#22c55e',
  cancelled: '#ef4444',
  no_show: '#6b7280'
};

const PIE_COLORS = ['#6aa8ff', '#22c55e', '#ef4444', '#6b7280'];

export const AnalyticsDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [appointmentData, setAppointmentData] = useState<AnalyticsDashboardData | null>(null);
  const [patientVisitsData, setPatientVisitsData] = useState<PatientVisitsData | null>(null);
  const [noShowData, setNoShowData] = useState<NoShowCancellationData | null>(null);
  const [growthData, setGrowthData] = useState<PatientGrowthData | null>(null);

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/src/app/webhook/clinic-portal/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      setDashboardStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    }
  };

  // Fetch appointment data
  const fetchAppointmentData = async (period: string) => {
    try {
      const params = new URLSearchParams({ period });
      const response = await fetch(`/api/src/app/webhook/clinic-portal/stats/daily?${params}`);
      if (!response.ok) throw new Error('Failed to fetch appointment data');
      const data = await response.json();
      setAppointmentData(data);
    } catch (err) {
      console.error('Error fetching appointment data:', err);
      setError('Failed to load appointment data');
    }
  };

  // Fetch patient visits data
  const fetchPatientVisitsData = async (period: string) => {
    try {
      const params = new URLSearchParams({ period });
      const response = await fetch(`/api/src/app/webhook/clinic-portal/stats/patient-visits?${params}`);
      if (!response.ok) throw new Error('Failed to fetch patient visits data');
      const data = await response.json();
      setPatientVisitsData(data);
    } catch (err) {
      console.error('Error fetching patient visits data:', err);
      setError('Failed to load patient visits data');
    }
  };

  // Fetch no-show and cancellation data
  const fetchNoShowData = async (period: string) => {
    try {
      const params = new URLSearchParams({ period });
      const response = await fetch(`/api/src/app/webhook/clinic-portal/stats/no-shows-cancellations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch no-show data');
      const data = await response.json();
      setNoShowData(data);
    } catch (err) {
      console.error('Error fetching no-show data:', err);
      setError('Failed to load no-show data');
    }
  };

  // Fetch patient growth data
  const fetchGrowthData = async (period: string) => {
    try {
      const params = new URLSearchParams({ period });
      const response = await fetch(`/api/src/app/webhook/clinic-portal/stats/patient-growth?${params}`);
      if (!response.ok) throw new Error('Failed to fetch patient growth data');
      const data = await response.json();
      setGrowthData(data);
    } catch (err) {
      console.error('Error fetching patient growth data:', err);
      setError('Failed to load patient growth data');
    }
  };

  // Load all data
  const loadAllData = async (period: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchAppointmentData(period),
        fetchPatientVisitsData(period),
        fetchNoShowData(period),
        fetchGrowthData(period)
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle period change
  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSelectedPeriod(period);
    loadAllData(period);
  };

  // Refresh data
  const refreshData = () => {
    loadAllData(selectedPeriod);
  };

  // Initial load
  useEffect(() => {
    loadAllData(selectedPeriod);
  }, []);

  // Render trend indicator
  const renderTrendIndicator = (change: string) => {
    const isPositive = change.startsWith('+');
    const isNegative = change.startsWith('-');
    
    if (isPositive) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      );
    }
    
    if (isNegative) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-gray-600">
        <span className="text-sm font-medium">{change}</span>
      </div>
    );
  };

  // Prepare pie chart data
  const preparePieData = () => {
    if (!appointmentData?.data) return [];
    
    const totals = appointmentData.data.reduce(
      (acc, item) => ({
        scheduled: acc.scheduled + item.scheduled,
        completed: acc.completed + item.completed,
        cancelled: acc.cancelled + item.cancelled,
        no_show: acc.no_show + item.no_show
      }),
      { scheduled: 0, completed: 0, cancelled: 0, no_show: 0 }
    );

    return [
      { name: 'Scheduled', value: totals.scheduled, color: CHART_COLORS.scheduled },
      { name: 'Completed', value: totals.completed, color: CHART_COLORS.completed },
      { name: 'Cancelled', value: totals.cancelled, color: CHART_COLORS.cancelled },
      { name: 'No-show', value: totals.no_show, color: CHART_COLORS.no_show }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData} className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive clinic business intelligence and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <Tabs value={selectedPeriod} onValueChange={(value) => handlePeriodChange(value as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="mt-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Patients</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.todayPatients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Appointments scheduled today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.totalPatients || 0}</div>
                <div className="flex items-center mt-1">
                  {growthData && renderTrendIndicator(growthData.trends.monthlyGrowthRate)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No-show Rate</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{noShowData?.noShows.rate || '0.0%'}</div>
                <div className="flex items-center mt-1">
                  {noShowData && renderTrendIndicator(noShowData.noShows.trend)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patientVisitsData?.completionRate.rate || '0.0%'}</div>
                <p className="text-xs text-muted-foreground">
                  {patientVisitsData?.completionRate.completed || 0} of {patientVisitsData?.completionRate.scheduled || 0} appointments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Appointment Status Breakdown - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of appointment statuses for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {preparePieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Trends</CardTitle>
                <CardDescription>
                  Appointment volumes over time by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={appointmentData?.data || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="scheduled" stroke={CHART_COLORS.scheduled} strokeWidth={2} />
                      <Line type="monotone" dataKey="completed" stroke={CHART_COLORS.completed} strokeWidth={2} />
                      <Line type="monotone" dataKey="cancelled" stroke={CHART_COLORS.cancelled} strokeWidth={2} />
                      <Line type="monotone" dataKey="no_show" stroke={CHART_COLORS.no_show} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Visits & Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Patient Visits Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Visits</CardTitle>
                <CardDescription>
                  Completed visits and unique patients over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={patientVisitsData?.visitsByPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="visits" fill={CHART_COLORS.completed} name="Total Visits" />
                      <Bar dataKey="uniquePatients" fill={CHART_COLORS.scheduled} name="Unique Patients" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Patient Database Growth */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Database Growth</CardTitle>
                <CardDescription>
                  Patient registration growth over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthData?.growthByPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="newRegistrations" 
                        stroke={CHART_COLORS.scheduled} 
                        strokeWidth={2}
                        name="New Registrations"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulativeTotal" 
                        stroke={CHART_COLORS.completed} 
                        strokeWidth={2}
                        name="Total Patients"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* No-show & Cancellation Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>No-show & Cancellation Trends</CardTitle>
                <CardDescription>
                  No-show and cancellation rates over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={noShowData?.byPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="noShows" 
                        stroke={CHART_COLORS.no_show} 
                        strokeWidth={2}
                        name="No-shows"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cancelled" 
                        stroke={CHART_COLORS.cancelled} 
                        strokeWidth={2}
                        name="Cancellations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest appointment activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardStats?.recentActivity?.slice(0, 8).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{activity.patientName}</p>
                          <p className="text-xs text-gray-600">{activity.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            activity.status === 'completed' ? 'default' :
                            activity.status === 'scheduled' ? 'secondary' :
                            activity.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {activity.status}
                        </Badge>
                        <div className="text-xs text-gray-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(activity.appointmentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Problem Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Problem Patients</CardTitle>
              <CardDescription>
                Patients with highest no-show and cancellation rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Patient Name</th>
                      <th className="text-center p-2 font-medium">No-shows</th>
                      <th className="text-center p-2 font-medium">Cancellations</th>
                      <th className="text-center p-2 font-medium">Total Missed</th>
                      <th className="text-center p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noShowData?.problemPatients?.slice(0, 10).map((patient, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{patient.name}</td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            {patient.noShows}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            {patient.cancellations}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="secondary">
                            {patient.totalMissed}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge 
                            variant={patient.totalMissed >= 5 ? 'destructive' : patient.totalMissed >= 3 ? 'secondary' : 'outline'}
                          >
                            {patient.totalMissed >= 5 ? 'High Risk' : patient.totalMissed >= 3 ? 'Moderate' : 'Low Risk'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!noShowData?.problemPatients || noShowData.problemPatients.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No problem patients found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};