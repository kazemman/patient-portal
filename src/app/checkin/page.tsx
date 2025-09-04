"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isToday } from "date-fns";
import { 
  Search, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  Users, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  Printer,
  Bell,
  RefreshCw,
  Filter,
  MoreHorizontal,
  UserCheck,
  AlertCircle,
  Timer
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";

// Schema definitions
const walkInPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  reasonForVisit: z.string().min(1, "Reason for visit is required"),
  insuranceProvider: z.string().optional(),
  insuranceId: z.string().optional(),
  notes: z.string().optional()
});

const checkInSchema = z.object({
  notes: z.string().optional(),
  notifyProvider: z.boolean().default(false),
  printTicket: z.boolean().default(true)
});

type WalkInPatient = z.infer<typeof walkInPatientSchema>;
type CheckInData = z.infer<typeof checkInSchema>;

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  appointmentTime: string;
  appointmentType: string;
  providerId: string;
  providerName: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "cancelled";
  reasonForVisit: string;
  notes?: string;
  checkedInAt?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
}

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  queuePosition: number;
  estimatedWaitTime: number;
  checkedInAt: string;
  status: "waiting" | "called" | "in-progress";
  appointmentType: string;
  providerId: string;
  providerName: string;
}

interface CheckInStats {
  totalAppointments: number;
  checkedIn: number;
  waiting: number;
  completed: number;
  averageWaitTime: number;
}

export default function PatientCheckInPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // State management
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<CheckInStats>({
    totalAppointments: 0,
    checkedIn: 0,
    waiting: 0,
    completed: 0,
    averageWaitTime: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalkInDialog, setShowWalkInDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Form setup
  const walkInForm = useForm<WalkInPatient>({
    resolver: zodResolver(walkInPatientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      phone: "",
      email: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      reasonForVisit: "",
      insuranceProvider: "",
      insuranceId: "",
      notes: ""
    }
  });

  const checkInForm = useForm<CheckInData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      notes: "",
      notifyProvider: false,
      printTicket: true
    }
  });

  // Authentication check
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch data
  const fetchAppointments = useCallback(async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/clinic/appointments", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      const todayAppointments = data.filter((apt: Appointment) => 
        isToday(new Date(apt.appointmentTime))
      );
      setAppointments(todayAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    }
  }, [router]);

  const fetchQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) return;

      const response = await fetch("/api/clinic/queue", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch queue");
      }

      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Failed to load queue");
    }
  }, []);

  const calculateStats = useCallback(() => {
    const totalAppointments = appointments.length;
    const checkedIn = appointments.filter(apt => apt.status === "checked-in").length;
    const waiting = queue.filter(item => item.status === "waiting").length;
    const completed = appointments.filter(apt => apt.status === "completed").length;
    const averageWaitTime = queue.length > 0 
      ? queue.reduce((sum, item) => sum + item.estimatedWaitTime, 0) / queue.length 
      : 0;

    setStats({
      totalAppointments,
      checkedIn,
      waiting,
      completed,
      averageWaitTime: Math.round(averageWaitTime)
    });
  }, [appointments, queue]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAppointments(), fetchQueue()]);
    setIsRefreshing(false);
  }, [fetchAppointments, fetchQueue]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAppointments(), fetchQueue()]);
      setIsLoading(false);
    };

    if (session?.user) {
      loadData();
    }
  }, [session, fetchAppointments, fetchQueue]);

  // Update stats when data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Filter appointments based on search
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      appointment.patientName.toLowerCase().includes(query) ||
      appointment.patientPhone.includes(query) ||
      appointment.id.toLowerCase().includes(query) ||
      appointment.reasonForVisit.toLowerCase().includes(query)
    );
  });

  // Handle patient check-in
  const handleCheckIn = async (appointmentId: string, checkInData: CheckInData) => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Update appointment status
      const updateResponse = await fetch("/api/clinic/appointments", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: appointmentId,
          status: "checked-in",
          notes: checkInData.notes,
          checkedInAt: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update appointment");
      }

      // Create check-in record
      const checkInResponse = await fetch("/api/clinic/checkins", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          appointmentId,
          checkedInAt: new Date().toISOString(),
          notes: checkInData.notes,
          notifyProvider: checkInData.notifyProvider,
          printTicket: checkInData.printTicket
        })
      });

      if (!checkInResponse.ok) {
        throw new Error("Failed to create check-in record");
      }

      // Add to queue
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        const queueResponse = await fetch("/api/clinic/queue", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            patientId: appointment.patientId,
            appointmentId,
            appointmentType: appointment.appointmentType,
            providerId: appointment.providerId
          })
        });

        if (!queueResponse.ok) {
          console.warn("Failed to add to queue, but check-in was successful");
        }
      }

      toast.success("Patient checked in successfully");
      setShowCheckInDialog(false);
      checkInForm.reset();
      await refreshData();

      // Print ticket if requested
      if (checkInData.printTicket) {
        handlePrintTicket(appointmentId);
      }

      // Send notification if requested
      if (checkInData.notifyProvider && appointment) {
        toast.success(`Provider ${appointment.providerName} has been notified`);
      }

    } catch (error) {
      console.error("Error checking in patient:", error);
      toast.error("Failed to check in patient");
    }
  };

  // Handle walk-in patient registration
  const handleWalkInRegistration = async (data: WalkInPatient) => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      // First, check if patient already exists
      const searchResponse = await fetch(
        `/api/clinic/patients?phone=${encodeURIComponent(data.phone)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      let patientId;
      if (searchResponse.ok) {
        const existingPatients = await searchResponse.json();
        if (existingPatients.length > 0) {
          patientId = existingPatients[0].id;
          toast.info("Existing patient found, checking in...");
        }
      }

      // If no existing patient, create new one
      if (!patientId) {
        const createPatientResponse = await fetch("/api/clinic/patients", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            phone: data.phone,
            email: data.email,
            address: data.address,
            emergencyContact: data.emergencyContact,
            emergencyPhone: data.emergencyPhone,
            insuranceProvider: data.insuranceProvider,
            insuranceId: data.insuranceId
          })
        });

        if (!createPatientResponse.ok) {
          throw new Error("Failed to create patient");
        }

        const newPatient = await createPatientResponse.json();
        patientId = newPatient.id;
      }

      // Create walk-in appointment
      const appointmentResponse = await fetch("/api/clinic/appointments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          patientId,
          appointmentTime: new Date().toISOString(),
          appointmentType: "walk-in",
          reasonForVisit: data.reasonForVisit,
          status: "checked-in",
          notes: data.notes,
          isWalkIn: true
        })
      });

      if (!appointmentResponse.ok) {
        throw new Error("Failed to create appointment");
      }

      const newAppointment = await appointmentResponse.json();

      // Add to queue
      await fetch("/api/clinic/queue", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          patientId,
          appointmentId: newAppointment.id,
          appointmentType: "walk-in"
        })
      });

      toast.success("Walk-in patient registered and checked in");
      setShowWalkInDialog(false);
      walkInForm.reset();
      await refreshData();

    } catch (error) {
      console.error("Error registering walk-in patient:", error);
      toast.error("Failed to register walk-in patient");
    }
  };

  // Handle batch check-in
  const handleBatchCheckIn = async () => {
    if (selectedAppointments.length === 0) {
      toast.error("Please select appointments to check in");
      return;
    }

    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const promises = selectedAppointments.map(appointmentId =>
        handleCheckIn(appointmentId, { notes: "", notifyProvider: false, printTicket: false })
      );

      await Promise.all(promises);
      setSelectedAppointments([]);
      toast.success(`${selectedAppointments.length} patients checked in successfully`);

    } catch (error) {
      console.error("Error with batch check-in:", error);
      toast.error("Some check-ins may have failed");
    }
  };

  // Handle print ticket
  const handlePrintTicket = (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    const queueItem = queue.find(item => item.appointmentId === appointmentId);
    
    if (!appointment) return;

    const ticketContent = `
      QUEUE TICKET
      ============
      Patient: ${appointment.patientName}
      Queue #: ${queueItem?.queuePosition || 'N/A'}
      Time: ${format(new Date(), 'HH:mm')}
      Est. Wait: ${queueItem?.estimatedWaitTime || 0} min
      Provider: ${appointment.providerName}
      ============
      Please keep this ticket
    `;

    // In a real app, this would send to a printer
    console.log("Printing ticket:", ticketContent);
    toast.success("Queue ticket printed");
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: "secondary",
      "checked-in": "default",
      "in-progress": "default",
      completed: "secondary",
      cancelled: "destructive"
    } as const;

    const colors = {
      scheduled: "text-blue-700 bg-blue-100",
      "checked-in": "text-green-700 bg-green-100",
      "in-progress": "text-yellow-700 bg-yellow-100",
      completed: "text-gray-700 bg-gray-100",
      cancelled: "text-red-700 bg-red-100"
    } as const;

    return (
      <Badge className={colors[status as keyof typeof colors] || colors.scheduled}>
        {status.replace("-", " ").toUpperCase()}
      </Badge>
    );
  };

  if (isPending || isLoading) {
    return (
      <AppLayout isPatientPortal={false}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patient Check-In</h1>
            <p className="text-muted-foreground">
              Manage patient arrivals and queue for {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowWalkInDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Walk-In Patient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                  <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Checked In</p>
                  <p className="text-2xl font-bold">{stats.checkedIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Waiting</p>
                  <p className="text-2xl font-bold">{stats.waiting}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Wait</p>
                  <p className="text-2xl font-bold">{stats.averageWaitTime}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="appointments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="appointments">Today's Appointments</TabsTrigger>
            <TabsTrigger value="queue">Patient Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-4">
            {/* Search and Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or appointment ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              
              {selectedAppointments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedAppointments.length} selected
                  </span>
                  <Button onClick={handleBatchCheckIn} size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Batch Check-In
                  </Button>
                </div>
              )}
            </div>

            {/* Appointments Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                          onCheckedChange={(checked) => {
                            setSelectedAppointments(
                              checked ? filteredAppointments.map(apt => apt.id) : []
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAppointments.includes(appointment.id)}
                            onCheckedChange={(checked) => {
                              setSelectedAppointments(prev =>
                                checked
                                  ? [...prev, appointment.id]
                                  : prev.filter(id => id !== appointment.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{appointment.patientName}</p>
                            <p className="text-sm text-muted-foreground">{appointment.reasonForVisit}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(appointment.appointmentTime), 'h:mm a')}</p>
                            {appointment.checkedInAt && (
                              <p className="text-muted-foreground">
                                Checked in: {format(new Date(appointment.checkedInAt), 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{appointment.appointmentType}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{appointment.providerName}</p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(appointment.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{appointment.patientPhone}</span>
                            </div>
                            {appointment.patientEmail && (
                              <div className="flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                <span>{appointment.patientEmail}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {appointment.status === "scheduled" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowCheckInDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Check In
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePrintTicket(appointment.id)}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Ticket
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Bell className="h-4 w-4 mr-2" />
                                  Notify Provider
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <MapPin className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredAppointments.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? "Try adjusting your search criteria" : "No appointments scheduled for today"}
                    </p>
                    <Button onClick={() => setShowWalkInDialog(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Walk-In Patient
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Current Queue ({queue.length} patients)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-primary">
                            #{item.queuePosition}
                          </div>
                          <div>
                            <h4 className="font-medium">{item.patientName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.appointmentType} • {item.providerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Checked in: {format(new Date(item.checkedInAt), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.status === "waiting" ? "secondary" : "default"}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Est. wait: {item.estimatedWaitTime}m
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {queue.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Queue is empty</h3>
                      <p className="text-muted-foreground">
                        No patients are currently waiting
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Walk-In Patient Dialog */}
        <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register Walk-In Patient</DialogTitle>
            </DialogHeader>
            
            <Form {...walkInForm}>
              <form onSubmit={walkInForm.handleSubmit(handleWalkInRegistration)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={walkInForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walkInForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={walkInForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walkInForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={walkInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={walkInForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={walkInForm.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walkInForm.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={walkInForm.control}
                  name="reasonForVisit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Visit *</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={walkInForm.control}
                    name="insuranceProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Provider</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walkInForm.control}
                    name="insuranceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={walkInForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowWalkInDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Register & Check In
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Check-In Dialog */}
        <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check In Patient</DialogTitle>
            </DialogHeader>
            
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">{selectedAppointment.patientName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAppointment.appointmentTime), 'h:mm a')} • {selectedAppointment.appointmentType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Provider: {selectedAppointment.providerName}
                  </p>
                </div>

                <Form {...checkInForm}>
                  <form onSubmit={checkInForm.handleSubmit((data) => handleCheckIn(selectedAppointment.id, data))} className="space-y-4">
                    <FormField
                      control={checkInForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-in Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any special instructions or notes..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={checkInForm.control}
                        name="notifyProvider"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Notify provider of patient arrival
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={checkInForm.control}
                        name="printTicket"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Print queue ticket for patient
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCheckInDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Check In Patient
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}