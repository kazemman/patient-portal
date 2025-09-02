"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Clock, Users, RefreshCw, CheckCircle, AlertCircle, CreditCard, DollarSign, PlusCircle, Loader2 } from 'lucide-react';

interface QueuePatient {
  id: number;
  patientId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  idValue: string;
  medicalAid: string;
  medicalAidNumber: string;
  checkinTime: string;
  paymentMethod: 'medical_aid' | 'cash' | 'both';
  status: string;
  notes: string;
  waitingTimeMinutes: number;
}

interface QueueStats {
  totalWaiting: number;
  averageWaitTime: number;
  paymentBreakdown: {
    medical_aid: number;
    cash: number;
    both: number;
  };
}

export const QueueDashboard = () => {
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<QueuePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<QueueStats>({
    totalWaiting: 0,
    averageWaitTime: 0,
    paymentBreakdown: { medical_aid: 0, cash: 0, both: 0 }
  });

  // Filter states
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [waitTimeFilter, setWaitTimeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('waiting_time');

  // Auto-refresh timer
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchQueue = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      const response = await fetch('/api/webhook/clinic-portal/queue');
      if (!response.ok) {
        throw new Error('Failed to fetch queue data');
      }
      
      const data = await response.json();
      
      // Ensure paymentMethod is always defined with a fallback
      const processedData = data.map((patient: QueuePatient) => ({
        ...patient,
        paymentMethod: patient.paymentMethod || 'cash',
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        phone: patient.phone || '',
        email: patient.email || '',
        idValue: patient.idValue || '',
        medicalAid: patient.medicalAid || '',
        medicalAidNumber: patient.medicalAidNumber || ''
      }));
      
      setPatients(processedData);
      setLastRefresh(new Date());
      
      // Calculate stats
      const totalWaiting = processedData.length;
      const averageWaitTime = totalWaiting > 0 
        ? Math.round(processedData.reduce((sum: number, p: QueuePatient) => sum + (p.waitingTimeMinutes || 0), 0) / totalWaiting)
        : 0;
      
      const paymentBreakdown = processedData.reduce((acc: any, p: QueuePatient) => {
        const method = p.paymentMethod || 'cash';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, { medical_aid: 0, cash: 0, both: 0 });

      setStats({
        totalWaiting,
        averageWaitTime,
        paymentBreakdown
      });

    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAsAttended = async (checkinId: number, patientName: string) => {
    try {
      const response = await fetch('/api/webhook/clinic-portal/queue/attend', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkin_id: checkinId,
          notes: `Attended by staff at ${new Date().toLocaleString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark patient as attended');
      }

      toast.success(`${patientName} marked as attended`);
      await fetchQueue();
    } catch (error) {
      console.error('Error marking patient as attended:', error);
      toast.error('Failed to mark patient as attended');
    }
  };

  const manualRefresh = () => {
    fetchQueue(true);
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...patients];

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(p => (p.paymentMethod || 'cash') === paymentFilter);
    }

    // Wait time filter
    if (waitTimeFilter !== 'all') {
      const waitTime = (p: QueuePatient) => p.waitingTimeMinutes || 0;
      if (waitTimeFilter === 'under_30') {
        filtered = filtered.filter(p => waitTime(p) < 30);
      } else if (waitTimeFilter === '30_to_60') {
        filtered = filtered.filter(p => waitTime(p) >= 30 && waitTime(p) <= 60);
      } else if (waitTimeFilter === 'over_60') {
        filtered = filtered.filter(p => waitTime(p) > 60);
      }
    }

    // Sorting
    if (sortBy === 'waiting_time') {
      filtered.sort((a, b) => (b.waitingTimeMinutes || 0) - (a.waitingTimeMinutes || 0));
    } else if (sortBy === 'checkin_time') {
      filtered.sort((a, b) => new Date(a.checkinTime || '').getTime() - new Date(b.checkinTime || '').getTime());
    }

    setFilteredPatients(filtered);
  }, [patients, paymentFilter, waitTimeFilter, sortBy]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const getPaymentMethodColor = (method: string | undefined) => {
    switch (method) {
      case 'medical_aid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cash':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'both':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string | undefined) => {
    switch (method) {
      case 'medical_aid':
        return <CreditCard className="h-3 w-3" />;
      case 'cash':
        return <DollarSign className="h-3 w-3" />;
      case 'both':
        return <PlusCircle className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const getWaitingTimeColor = (minutes: number | undefined) => {
    const mins = minutes || 0;
    if (mins < 30) return 'text-green-600';
    if (mins <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatWaitingTime = (minutes: number | undefined) => {
    const mins = minutes || 0;
    if (mins < 60) {
      return `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMinutes = mins % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading queue...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Queue</h1>
          <p className="text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button 
          onClick={manualRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waiting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWaiting}</div>
            <p className="text-xs text-muted-foreground">patients in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWaitingTime(stats.averageWaitTime)}</div>
            <p className="text-xs text-muted-foreground">current average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Aid</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paymentBreakdown.medical_aid}</div>
            <p className="text-xs text-muted-foreground">patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.paymentBreakdown.cash}</div>
            <p className="text-xs text-muted-foreground">patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Both</CardTitle>
            <PlusCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.paymentBreakdown.both}</div>
            <p className="text-xs text-muted-foreground">patients</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="medical_aid">Medical Aid</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Waiting Time</label>
              <Select value={waitTimeFilter} onValueChange={setWaitTimeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                  <SelectItem value="under_30">{"< 30 minutes"}</SelectItem>
                  <SelectItem value="30_to_60">30-60 minutes</SelectItem>
                  <SelectItem value="over_60">{"> 60 minutes"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting_time">Waiting Time</SelectItem>
                  <SelectItem value="checkin_time">Check-in Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Queue ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No patients waiting</h3>
              <p className="text-muted-foreground">The queue is currently empty.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Waiting Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {patient.firstName || ''} {patient.lastName || ''}
                          </div>
                          {patient.medicalAid && (
                            <div className="text-xs text-muted-foreground">
                              {patient.medicalAid}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{patient.phone || ''}</div>
                          {patient.email && (
                            <div className="text-xs text-muted-foreground">
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {patient.idValue || ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getPaymentMethodColor(patient.paymentMethod)} flex items-center gap-1 w-fit`}
                        >
                          {getPaymentMethodIcon(patient.paymentMethod)}
                          {(patient.paymentMethod || 'cash').replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {patient.checkinTime ? new Date(patient.checkinTime).toLocaleTimeString() : '--'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${getWaitingTimeColor(patient.waitingTimeMinutes)}`}>
                          {formatWaitingTime(patient.waitingTimeMinutes)}
                        </div>
                        {(patient.waitingTimeMinutes || 0) > 60 && (
                          <AlertCircle className="h-4 w-4 text-red-500 inline ml-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Attended
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark as Attended</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to mark{' '}
                                <strong>{patient.firstName || ''} {patient.lastName || ''}</strong>{' '}
                                as attended? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => markAsAttended(patient.id, `${patient.firstName || ''} ${patient.lastName || ''}`)}
                              >
                                Mark Attended
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};