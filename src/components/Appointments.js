"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, CalendarPlus, CalendarSearch, CalendarDays, ClockArrowUp, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const APPOINTMENT_STATUSES = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'No Show', color: 'bg-gray-100 text-gray-800' }
};

export default function Appointments({ className }) {
  // State management
  const [view, setView] = useState('list');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Create appointment form state
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    reason: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/webhook/clinic-portal/appointment/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: searchTerm,
          status: statusFilter === 'all' ? undefined : statusFilter,
          date: dateFilter || undefined
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        toast.error('Failed to load appointments');
      }
    } catch (error) {
      toast.error('Error loading appointments');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateFilter]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch('/webhook/clinic-portal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', type: 'patient' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  // Patient search
  const searchPatients = useCallback(async (term) => {
    if (!term.trim()) {
      setPatientSearchResults([]);
      return;
    }

    try {
      setPatientSearchLoading(true);
      const response = await fetch('/webhook/clinic-portal/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: term, type: 'patient' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatientSearchResults(data.patients || []);
      }
    } catch (error) {
      console.error('Patient search error:', error);
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchTerm, searchPatients]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!formData.patient_id) {
      errors.patient_id = 'Patient is required';
    }
    
    if (!formData.appointment_date) {
      errors.appointment_date = 'Date is required';
    }
    
    if (!formData.appointment_time) {
      errors.appointment_time = 'Time is required';
    }
    
    if (formData.appointment_date && formData.appointment_time) {
      const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
      if (appointmentDateTime <= new Date()) {
        errors.appointment_date = 'Appointment must be in the future';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Create appointment
  const handleCreateAppointment = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      const response = await fetch('/webhook/clinic-portal/appointment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          appointment_datetime: `${formData.appointment_date}T${formData.appointment_time}`
        })
      });
      
      if (response.ok) {
        toast.success('Appointment created successfully');
        setCreateModalOpen(false);
        setFormData({
          patient_id: '',
          appointment_date: '',
          appointment_time: '',
          duration_minutes: 30,
          reason: '',
          notes: ''
        });
        fetchAppointments();
      } else {
        toast.error('Failed to create appointment');
      }
    } catch (error) {
      toast.error('Error creating appointment');
    } finally {
      setSubmitting(false);
    }
  }, [formData, validateForm, fetchAppointments]);

  // Update appointment status
  const updateAppointmentStatus = useCallback(async (appointmentId, status, reason = '') => {
    try {
      const response = await fetch('/webhook/clinic-portal/appointment/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          status,
          reason
        })
      });
      
      if (response.ok) {
        toast.success(`Appointment ${status} successfully`, {
          action: status === 'cancelled' || status === 'no-show' ? {
            label: 'Undo',
            onClick: () => updateAppointmentStatus(appointmentId, 'scheduled')
          } : undefined
        });
        fetchAppointments();
      } else {
        toast.error(`Failed to ${status} appointment`);
      }
    } catch (error) {
      toast.error('Error updating appointment');
    }
  }, [fetchAppointments]);

  // Calculate summary stats
  const appointmentsSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => 
      apt.appointment_date?.startsWith(today)
    );
    const upcomingAppointments = appointments.filter(apt => 
      new Date(apt.appointment_date) > new Date() && apt.status === 'scheduled'
    );
    
    return {
      today: todayAppointments.length,
      upcoming: upcomingAppointments.length
    };
  }, [appointments]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const matchesSearch = !searchTerm || 
        appointment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      
      const matchesDate = !dateFilter || 
        appointment.appointment_date?.startsWith(dateFilter);
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchTerm, statusFilter, dateFilter]);

  // Print schedule
  const handlePrint = useCallback(() => {
    const printContent = document.getElementById('appointment-schedule');
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Restore React functionality
  }, []);

  // Calendar grid generation
  const generateCalendarGrid = useCallback(() => {
    const startDate = new Date(selectedDate);
    startDate.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start of week
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayAppointments = filteredAppointments.filter(apt => 
        apt.appointment_date?.startsWith(date.toISOString().split('T')[0])
      );
      
      days.push({
        date,
        appointments: dayAppointments
      });
    }
    
    return days;
  }, [selectedDate, filteredAppointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header with summary and actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-heading font-bold">Appointments</h2>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              Today: {appointmentsSummary.today}
            </Badge>
            <Badge variant="secondary" className="bg-green-50 text-green-700">
              Upcoming: {appointmentsSummary.upcoming}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            Print Schedule
          </Button>
          
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CalendarPlus className="w-4 h-4" />
                Create Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Appointment</DialogTitle>
                <DialogDescription>
                  Schedule a new appointment for a patient.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-search">Patient</Label>
                  <div className="relative">
                    <Input
                      id="patient-search"
                      placeholder="Search for patient..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className={formErrors.patient_id ? 'border-destructive' : ''}
                    />
                    {patientSearchResults.length > 0 && (
                      <Card className="absolute top-full left-0 right-0 z-10 max-h-40 overflow-y-auto">
                        <CardContent className="p-2">
                          {patientSearchResults.map((patient) => (
                            <button
                              key={patient.id}
                              type="button"
                              className="w-full p-2 text-left hover:bg-accent rounded flex items-center gap-2"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, patient_id: patient.id }));
                                setPatientSearchTerm(patient.name);
                                setPatientSearchResults([]);
                              }}
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={patient.avatar} />
                                <AvatarFallback>
                                  {patient.name?.split(' ').map(n => n[0]).join('') || 'P'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{patient.name}</div>
                                <div className="text-xs text-muted-foreground">{patient.phone}</div>
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {formErrors.patient_id && (
                    <p className="text-sm text-destructive">{formErrors.patient_id}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-date">Date</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                      className={formErrors.appointment_date ? 'border-destructive' : ''}
                    />
                    {formErrors.appointment_date && (
                      <p className="text-sm text-destructive">{formErrors.appointment_date}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="appointment-time">Time</Label>
                    <Input
                      id="appointment-time"
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                      className={formErrors.appointment_time ? 'border-destructive' : ''}
                    />
                    {formErrors.appointment_time && (
                      <p className="text-sm text-destructive">{formErrors.appointment_time}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select 
                    value={formData.duration_minutes.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="Appointment reason..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Creating...' : 'Create Appointment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <CalendarSearch className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full lg:w-40"
            />
            
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div id="appointment-schedule">
        <Tabs value={view} className="space-y-6">
          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment List</CardTitle>
                <CardDescription>
                  {filteredAppointments.length} appointments found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointments found matching your criteria.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <ClockArrowUp className="w-4 h-4 text-muted-foreground" />
                              {new Date(appointment.appointment_date).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={appointment.patient_avatar} />
                                <AvatarFallback>
                                  {appointment.patient_name?.split(' ').map(n => n[0]).join('') || 'P'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{appointment.patient_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.patient_phone}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{appointment.duration_minutes} min</TableCell>
                          <TableCell>{appointment.reason || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={APPOINTMENT_STATUSES[appointment.status]?.color || 'bg-gray-100 text-gray-800'}>
                              {APPOINTMENT_STATUSES[appointment.status]?.label || appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {appointment.status === 'scheduled' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                  >
                                    Complete
                                  </Button>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        Cancel
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to cancel this appointment? This action can be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                        >
                                          Confirm Cancel
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        No Show
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Mark as No Show</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Mark this appointment as a no show? This action can be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => updateAppointmentStatus(appointment.id, 'no-show')}
                                        >
                                          Confirm No Show
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5" />
                  Week View
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() - 7);
                      setSelectedDate(newDate);
                    }}
                  >
                    Previous Week
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setDate(selectedDate.getDate() + 7);
                      setSelectedDate(newDate);
                    }}
                  >
                    Next Week
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {generateCalendarGrid().map((day, index) => (
                    <Card key={index} className="min-h-40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {day.date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        {day.appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className={`p-2 rounded text-xs ${APPOINTMENT_STATUSES[appointment.status]?.color || 'bg-gray-100 text-gray-800'}`}
                          >
                            <div className="font-medium">
                              {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <div className="truncate">{appointment.patient_name}</div>
                            <div className="truncate text-xs opacity-75">
                              {appointment.reason}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}