"use client";

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CalendarIcon, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  UserCheck,
  AlertTriangle,
  Activity,
  FileText,
  Filter,
  RefreshCw,
  Calendar as CalendarClock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

interface AnalyticsData {
  metrics: {
    patientSatisfaction: number;
    averageWaitTime: number;
    providerUtilization: number;
    revenue: number;
    patientVolume: number;
    noShowRate: number;
  };
  trends: {
    appointments: Array<{ date: string; count: number; }>;
    revenue: Array<{ date: string; amount: number; }>;
    waitTimes: Array<{ date: string; minutes: number; }>;
  };
  departments: Array<{ name: string; appointments: number; revenue: number; satisfaction: number; }>;
  appointmentTypes: Array<{ type: string; count: number; percentage: number; }>;
  providerStats: Array<{ name: string; appointments: number; satisfaction: number; utilization: number; }>;
  heatmapData: Array<{ hour: number; day: string; appointments: number; }>;
}

const CHART_COLORS = ['#488FD9', '#69C490', '#F5A623', '#D63384', '#20C997', '#6F42C1'];

const MetricCard = ({ title, value, change, trend, icon: Icon, color = "primary" }: {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  icon: any;
  color?: string;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("h-4 w-4", color === "primary" && "text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={cn(
              trend === 'up' ? 'text-emerald-500' : 'text-red-500'
            )}>
              {Math.abs(change)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState('30days');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let startDate: Date;
      let endDate = new Date();

      if (timePeriod === 'custom' && dateRange.from && dateRange.to) {
        startDate = dateRange.from;
        endDate = dateRange.to;
      } else {
        switch (timePeriod) {
          case 'today':
            startDate = new Date();
            break;
          case '7days':
            startDate = subDays(endDate, 7);
            break;
          case '30days':
            startDate = subDays(endDate, 30);
            break;
          case '90days':
            startDate = subDays(endDate, 90);
            break;
          case 'thisweek':
            startDate = startOfWeek(endDate);
            endDate = endOfWeek(endDate);
            break;
          case 'thismonth':
            startDate = startOfMonth(endDate);
            endDate = endOfMonth(endDate);
            break;
          default:
            startDate = subDays(endDate, 30);
        }
      }

      const params = new URLSearchParams({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        department: selectedDepartment,
        provider: selectedProvider
      });

      const response = await fetch(`/api/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      
      // Mock data for demonstration
      setData({
        metrics: {
          patientSatisfaction: 4.7,
          averageWaitTime: 18,
          providerUtilization: 87,
          revenue: 125400,
          patientVolume: 2847,
          noShowRate: 12
        },
        trends: {
          appointments: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'MMM dd'),
            count: Math.floor(Math.random() * 50) + 80
          })),
          revenue: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'MMM dd'),
            amount: Math.floor(Math.random() * 5000) + 3000
          })),
          waitTimes: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'MMM dd'),
            minutes: Math.floor(Math.random() * 20) + 10
          }))
        },
        departments: [
          { name: 'Cardiology', appointments: 342, revenue: 45600, satisfaction: 4.8 },
          { name: 'Neurology', appointments: 298, revenue: 38900, satisfaction: 4.6 },
          { name: 'Orthopedics', appointments: 267, revenue: 34200, satisfaction: 4.5 },
          { name: 'Dermatology', appointments: 189, revenue: 23800, satisfaction: 4.9 }
        ],
        appointmentTypes: [
          { type: 'Consultation', count: 1240, percentage: 43.5 },
          { type: 'Follow-up', count: 856, percentage: 30.1 },
          { type: 'Procedure', count: 485, percentage: 17.0 },
          { type: 'Emergency', count: 266, percentage: 9.4 }
        ],
        providerStats: [
          { name: 'Dr. Sarah Johnson', appointments: 234, satisfaction: 4.9, utilization: 92 },
          { name: 'Dr. Michael Chen', appointments: 198, satisfaction: 4.7, utilization: 88 },
          { name: 'Dr. Emily Davis', appointments: 187, satisfaction: 4.8, utilization: 85 },
          { name: 'Dr. Robert Wilson', appointments: 156, satisfaction: 4.6, utilization: 79 }
        ],
        heatmapData: Array.from({ length: 7 }, (_, day) => 
          Array.from({ length: 12 }, (_, hour) => ({
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
            hour: hour + 8,
            appointments: Math.floor(Math.random() * 15) + 5
          }))
        ).flat()
      });
    } finally {
      setLoading(false);
    }
  }, [timePeriod, selectedDepartment, selectedProvider, dateRange]);

  // Initial data fetch and setup auto-refresh
  useEffect(() => {
    fetchAnalyticsData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalyticsData, 5 * 60 * 1000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchAnalyticsData]);

  const handleExportData = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`/api/analytics/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Analytics data exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export data as ${format.toUpperCase()}`);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAnalyticsData();
    toast.success('Analytics data refreshed');
  }, [fetchAnalyticsData]);

  if (isPending) {
    return <LoadingSkeleton />;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive clinic performance insights and metrics</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Period Filter */}
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisweek">This Week</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {timePeriod === 'custom' && (
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Department Filter */}
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
                <SelectItem value="neurology">Neurology</SelectItem>
                <SelectItem value="orthopedics">Orthopedics</SelectItem>
                <SelectItem value="dermatology">Dermatology</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Options */}
            <Select onValueChange={(value) => handleExportData(value as 'csv' | 'pdf' | 'excel')}>
              <SelectTrigger className="w-[120px]">
                <Download className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">Export CSV</SelectItem>
                <SelectItem value="excel">Export Excel</SelectItem>
                <SelectItem value="pdf">Export PDF</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && <LoadingSkeleton />}
        
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Error loading analytics: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <MetricCard
                title="Patient Satisfaction"
                value={`${data.metrics.patientSatisfaction}/5.0`}
                change={2.3}
                trend="up"
                icon={Users}
                color="primary"
              />
              <MetricCard
                title="Avg Wait Time"
                value={`${data.metrics.averageWaitTime} min`}
                change={-5.2}
                trend="down"
                icon={Clock}
                color="primary"
              />
              <MetricCard
                title="Provider Utilization"
                value={`${data.metrics.providerUtilization}%`}
                change={3.1}
                trend="up"
                icon={UserCheck}
                color="primary"
              />
              <MetricCard
                title="Revenue"
                value={`$${(data.metrics.revenue / 1000).toFixed(0)}k`}
                change={12.8}
                trend="up"
                icon={DollarSign}
                color="primary"
              />
              <MetricCard
                title="Patient Volume"
                value={data.metrics.patientVolume.toLocaleString()}
                change={7.4}
                trend="up"
                icon={Activity}
                color="primary"
              />
              <MetricCard
                title="No-Show Rate"
                value={`${data.metrics.noShowRate}%`}
                change={-1.8}
                trend="down"
                icon={AlertTriangle}
                color="primary"
              />
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="departments">Departments</TabsTrigger>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="heatmap">Activity</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Appointment Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointment Types Distribution</CardTitle>
                      <CardDescription>Breakdown of appointment types this period</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.appointmentTypes}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ type, percentage }) => `${type} (${percentage}%)`}
                          >
                            {data.appointmentTypes.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Revenue Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                      <CardDescription>Daily revenue over the selected period</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trends.revenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke={CHART_COLORS[0]} 
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[0] }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Department Performance Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Performance Summary</CardTitle>
                    <CardDescription>Key metrics by department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {data.departments.map((dept, index) => (
                        <div key={dept.name} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{dept.name}</h4>
                            <Badge variant="secondary">{dept.appointments} appts</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Revenue</span>
                              <span className="font-medium">${dept.revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Satisfaction</span>
                              <span className="font-medium">{dept.satisfaction}/5.0</span>
                            </div>
                            <Progress value={(dept.satisfaction / 5) * 100} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Appointment Volume Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointment Volume Trend</CardTitle>
                      <CardDescription>Daily appointment counts over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trends.appointments}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke={CHART_COLORS[1]} 
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[1] }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Wait Time Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Average Wait Time Trend</CardTitle>
                      <CardDescription>Daily average wait times in minutes</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trends.waitTimes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} min`, 'Wait Time']} />
                          <Line 
                            type="monotone" 
                            dataKey="minutes" 
                            stroke={CHART_COLORS[2]} 
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[2] }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Appointments */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Appointments by Department</CardTitle>
                      <CardDescription>Appointment volume comparison</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.departments}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="appointments" fill={CHART_COLORS[0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Department Revenue */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Department</CardTitle>
                      <CardDescription>Revenue comparison across departments</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.departments}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill={CHART_COLORS[3]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Providers Tab */}
              <TabsContent value="providers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Performance</CardTitle>
                    <CardDescription>Individual provider statistics and metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.providerStats.map((provider, index) => (
                        <div key={provider.name} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{provider.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{provider.appointments} appointments</span>
                              <span>Satisfaction: {provider.satisfaction}/5.0</span>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="text-sm font-medium">Utilization: {provider.utilization}%</div>
                            <Progress value={provider.utilization} className="w-24 h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Heatmap Tab */}
              <TabsContent value="heatmap" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Heatmap</CardTitle>
                    <CardDescription>Peak appointment hours by day of week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <div className="w-12 text-sm font-medium">{day}</div>
                          <div className="flex space-x-1">
                            {Array.from({ length: 12 }, (_, hour) => {
                              const appointment = data.heatmapData.find(
                                d => d.day === day && d.hour === hour + 8
                              );
                              const intensity = appointment ? Math.min(appointment.appointments / 15, 1) : 0;
                              return (
                                <div
                                  key={hour}
                                  className="w-8 h-6 rounded-sm flex items-center justify-center text-xs"
                                  style={{
                                    backgroundColor: `rgba(72, 143, 217, ${intensity})`,
                                    color: intensity > 0.5 ? 'white' : 'black'
                                  }}
                                  title={`${hour + 8}:00 - ${appointment?.appointments || 0} appointments`}
                                >
                                  {appointment?.appointments || 0}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground mt-4">
                        <span>8 AM</span>
                        <span>12 PM</span>
                        <span>4 PM</span>
                        <span>8 PM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}