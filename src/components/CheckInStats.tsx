"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Users, Clock, CreditCard, FileText, RefreshCw, Download } from 'lucide-react';

interface CheckInData {
  date: string;
  total_checkins: number;
  payment_method_breakdown: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  status_breakdown: {
    waiting: number;
    attended: number;
    cancelled: number;
  };
  average_waiting_time: number;
  no_shows?: number;
}

interface WeeklyData extends Omit<CheckInData, 'date' | 'no_shows'> {
  week: string;
  week_start: string;
  week_end: string;
  daily_average: number;
}

interface MonthlyData extends Omit<CheckInData, 'date' | 'no_shows'> {
  month: string;
  month_name: string;
  daily_average: number;
  peak_day: string | null;
}

interface Summary {
  total_checkins: number;
  daily_average?: number;
  weekly_average?: number;
  monthly_average?: number;
  overall_avg_waiting_time: number;
  payment_method_totals: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  attendance_rate: number;
  growth_trend?: number;
  peak_month?: {
    month: string;
    month_name: string;
    checkins: number;
  };
  busiest_day_of_week?: string;
}

interface ApiResponse {
  daily_data?: CheckInData[];
  weekly_data?: WeeklyData[];
  monthly_data?: MonthlyData[];
  summary: Summary;
  period?: {
    start_date: string;
    end_date: string;
  };
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

type TimePeriod = 'daily' | 'weekly' | 'monthly';

const PAYMENT_METHOD_COLORS = {
  medical_aid: '#10B981', // Green
  cash: '#3B82F6',       // Blue
  both: '#F59E0B'        // Orange
};

export const CheckInStats = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('daily');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async (period: TimePeriod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/webhook/clinic-portal/checkin-stats/${period}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching check-in stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData(selectedPeriod);
  }, [fetchData, selectedPeriod]);

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [fetchData, selectedPeriod]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(selectedPeriod);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData, selectedPeriod]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  const getPaymentMethodData = () => {
    if (!data?.summary.payment_method_totals) return [];
    
    const totals = data.summary.payment_method_totals;
    return [
      { name: 'Medical Aid', value: totals.medical_aid, color: PAYMENT_METHOD_COLORS.medical_aid },
      { name: 'Cash', value: totals.cash, color: PAYMENT_METHOD_COLORS.cash },
      { name: 'Both', value: totals.both, color: PAYMENT_METHOD_COLORS.both }
    ].filter(item => item.value > 0);
  };

  const getTrendData = () => {
    if (!data) return [];

    if (selectedPeriod === 'daily' && data.daily_data) {
      return data.daily_data.map(item => ({
        period: new Date(item.date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short' 
        }),
        checkins: item.total_checkins,
        waiting_time: item.average_waiting_time,
        medical_aid: item.payment_method_breakdown.medical_aid,
        cash: item.payment_method_breakdown.cash,
        both: item.payment_method_breakdown.both
      }));
    } else if (selectedPeriod === 'weekly' && data.weekly_data) {
      return data.weekly_data.map(item => ({
        period: `Week ${item.week.split('-W')[1]}`,
        checkins: item.total_checkins,
        waiting_time: item.average_waiting_time,
        medical_aid: item.payment_method_breakdown.medical_aid,
        cash: item.payment_method_breakdown.cash,
        both: item.payment_method_breakdown.both
      }));
    } else if (selectedPeriod === 'monthly' && data.monthly_data) {
      return data.monthly_data.map(item => ({
        period: item.month_name.split(' ')[0],
        checkins: item.total_checkins,
        waiting_time: item.average_waiting_time,
        medical_aid: item.payment_method_breakdown.medical_aid,
        cash: item.payment_method_breakdown.cash,
        both: item.payment_method_breakdown.both
      }));
    }

    return [];
  };

  const getWaitingTimeDistribution = () => {
    if (!data) return [];

    const totalCheckins = data.summary.total_checkins;
    const avgWaitTime = data.summary.overall_avg_waiting_time;

    // Estimate distribution based on average waiting time
    const under30 = Math.round(totalCheckins * (avgWaitTime < 30 ? 0.6 : avgWaitTime < 60 ? 0.4 : 0.2));
    const between30_60 = Math.round(totalCheckins * (avgWaitTime < 30 ? 0.3 : avgWaitTime < 60 ? 0.5 : 0.3));
    const over60 = totalCheckins - under30 - between30_60;

    return [
      { range: '< 30 min', count: under30, color: '#10B981' },
      { range: '30-60 min', count: between30_60, color: '#F59E0B' },
      { range: '> 60 min', count: over60, color: '#EF4444' }
    ].filter(item => item.count > 0);
  };

  const exportData = () => {
    if (!data) return;

    const exportContent = JSON.stringify(data, null, 2);
    const blob = new Blob([exportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin-stats-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Check-In Statistics</h2>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((period) => (
              <div key={period} className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Check-In Statistics</h2>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4 text-center">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const trendData = getTrendData();
  const paymentMethodData = getPaymentMethodData();
  const waitingTimeData = getWaitingTimeDistribution();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Check-In Statistics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex rounded-lg border p-1">
            {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="capitalize"
              >
                {period}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.summary.total_checkins)}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'daily' && data.summary.daily_average && 
                `${data.summary.daily_average} per day average`
              }
              {selectedPeriod === 'weekly' && data.summary.weekly_average && 
                `${data.summary.weekly_average} per week average`
              }
              {selectedPeriod === 'monthly' && data.summary.monthly_average && 
                `${data.summary.monthly_average} per month average`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_METHOD_COLORS.medical_aid }} />
                  <span className="text-sm">Medical Aid</span>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(data.summary.payment_method_totals.medical_aid, data.summary.total_checkins)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_METHOD_COLORS.cash }} />
                  <span className="text-sm">Cash</span>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(data.summary.payment_method_totals.cash, data.summary.total_checkins)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_METHOD_COLORS.both }} />
                  <span className="text-sm">Both</span>
                </div>
                <span className="text-sm font-medium">
                  {formatPercentage(data.summary.payment_method_totals.both, data.summary.total_checkins)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.overall_avg_waiting_time} min</div>
            <p className="text-xs text-muted-foreground">
              Across all attended patients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.attendance_rate}%</div>
            <div className="flex items-center gap-1 mt-1">
              {data.summary.growth_trend !== undefined && (
                <>
                  {data.summary.growth_trend >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${data.summary.growth_trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(data.summary.growth_trend)}% trend
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="checkins" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No payment method data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volume by Period */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Volumes</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="checkins" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No volume data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waiting Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Waiting Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {waitingTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={waitingTimeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No waiting time data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Check-ins</TableHead>
                    <TableHead className="text-right">Medical Aid</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Both</TableHead>
                    <TableHead className="text-right">Avg Wait (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trendData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.period}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.checkins)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${PAYMENT_METHOD_COLORS.medical_aid}20`, color: PAYMENT_METHOD_COLORS.medical_aid }}>
                          {item.medical_aid}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${PAYMENT_METHOD_COLORS.cash}20`, color: PAYMENT_METHOD_COLORS.cash }}>
                          {item.cash}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${PAYMENT_METHOD_COLORS.both}20`, color: PAYMENT_METHOD_COLORS.both }}>
                          {item.both}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.waiting_time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No detailed data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      {data.summary.busiest_day_of_week && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Busiest day: <strong className="capitalize">{data.summary.busiest_day_of_week}</strong></span>
              </div>
              {data.summary.peak_month && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Peak month: <strong>{data.summary.peak_month.month_name}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total patients served: <strong>{formatNumber(data.summary.total_checkins)}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};