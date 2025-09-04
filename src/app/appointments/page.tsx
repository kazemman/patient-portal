"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Plus, Search, Filter, Download, Eye, Edit, Trash2, Calendar, Clock, User, Building, AlertCircle, CheckCircle, XCircle, MoreHorizontal } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form validation schemas
const appointmentFormSchema = z.object({
  patientId: z.number().min(1, "Patient is required"),
  staffId: z.number().min(1, "Staff member is required"),
  appointmentDate: z.date({
    required_error: "Appointment date is required",
  }),
  appointmentTime: z.string().min(1, "Appointment time is required"),
  duration: z.number().min(15).max(180).default(30),
  reason: z.string().min(1, "Reason is required").max(500),
  notes: z.string().max(1000).optional(),
  departmentId: z.number().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

interface Appointment {
  id: number;
  patientId: number;
  staffId: number;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: string;
  reason: string;
  notes?: string;
  departmentId?: number;
  priority: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  staff: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    department: string;
  };
}

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface Stats {
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedToday: number;
}

const statusConfig = {
  scheduled: { label: "Scheduled", color: "bg-blue-500", icon: Calendar },
  "checked-in": { label: "Checked In", color: "bg-yellow-500", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-orange-500", icon: User },
  completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-500", icon: XCircle },
  "no-show": { label: "No Show", color: "bg-red-500", icon: AlertCircle },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-100 text-gray-800" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-800" },
  high: { label: "High", color: "bg-red-100 text-red-800" },
};

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30"
];

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("appointmentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState("table");

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      duration: 30,
      priority: "normal",
    },
  });

  const fetchAppointments = useCallback(async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sort: sortField,
        order: sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (departmentFilter && departmentFilter !== "all") params.append("departmentId", departmentFilter);
      if (staffFilter && staffFilter !== "all") params.append("staffId", staffFilter);
      if (dateFilter) params.append("date", dateFilter);

      const response = await fetch(`/api/clinic/appointments?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, searchTerm, statusFilter, departmentFilter, staffFilter, dateFilter, router]);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const [patientsRes, staffRes, departmentsRes, statsRes] = await Promise.all([
        fetch("/api/clinic/patients?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/clinic/staff?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/clinic/departments", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (patientsRes.status === 401 || staffRes.status === 401 || departmentsRes.status === 401 || statsRes.status === 401) {
        router.push("/login");
        return;
      }

      const [patientsData, staffData, departmentsData, statsData] = await Promise.all([
        patientsRes.json(),
        staffRes.json(),
        departmentsRes.json(),
        statsRes.json(),
      ]);

      setPatients(patientsData);
      setStaff(staffData);
      setDepartments(departmentsData);
      setStats({
        totalAppointments: 0,
        todayAppointments: statsData.todayAppointments || 0,
        upcomingAppointments: 0,
        completedToday: statsData.completedToday || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    }
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchData(), fetchAppointments()]);
      setLoading(false);
    };

    loadData();
  }, [fetchData, fetchAppointments]);

  const handleSubmit = async (data: AppointmentFormData) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const appointmentData = {
        ...data,
        appointmentDate: format(data.appointmentDate, "yyyy-MM-dd"),
      };

      const url = selectedAppointment 
        ? `/api/clinic/appointments?id=${selectedAppointment.id}`
        : "/api/clinic/appointments";
      
      const method = selectedAppointment ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save appointment");
      }

      toast.success(selectedAppointment ? "Appointment updated successfully" : "Appointment created successfully");
      setShowAddDialog(false);
      setShowEditDialog(false);
      setSelectedAppointment(null);
      form.reset();
      await fetchAppointments();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/clinic/appointments?id=${appointmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }

      toast.success("Appointment cancelled successfully");
      await fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const handleStatusUpdate = async (appointmentId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/clinic/appointments?id=${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update appointment status");
      }

      toast.success("Appointment status updated");
      await fetchAppointments();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update appointment status");
    }
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    form.reset({
      patientId: appointment.patientId,
      staffId: appointment.staffId,
      appointmentDate: new Date(appointment.appointmentDate),
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      reason: appointment.reason,
      notes: appointment.notes || "",
      departmentId: appointment.departmentId || undefined,
      priority: appointment.priority as "low" | "normal" | "high",
    });
    setShowEditDialog(true);
  };

  const openDetailsDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsDialog(true);
  };

  const exportData = () => {
    const csvContent = [
      ["Date", "Time", "Patient", "Staff", "Status", "Reason", "Priority"],
      ...appointments.map(apt => [
        apt.appointmentDate,
        apt.appointmentTime,
        `${apt.patient.firstName} ${apt.patient.lastName}`,
        `${apt.staff.firstName} ${apt.staff.lastName}`,
        apt.status,
        apt.reason,
        apt.priority,
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDepartmentFilter("");
    setStaffFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  const todayAppointments = appointments.filter(apt => 
    apt.appointmentDate === format(new Date(), "yyyy-MM-dd")
  );

  if (loading) {
    return (
      <AppLayout isPatientPortal={false}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointments Management</h1>
            <p className="text-gray-600 mt-1">Manage patient appointments, scheduling, and status updates</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={exportData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Appointment</DialogTitle>
                  <DialogDescription>
                    Schedule a new appointment for a patient
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Patient</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select patient" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {patients.map((patient) => (
                                  <SelectItem key={patient.id} value={patient.id.toString()}>
                                    {patient.firstName} {patient.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="staffId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Staff Member</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {staff.filter(s => s.role === 'doctor').map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    Dr. {member.firstName} {member.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="appointmentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appointmentTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="15"
                                max="180"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="departmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Department</SelectItem>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id.toString()}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Visit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Annual checkup, Follow-up consultation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes or special instructions"
                              {...field}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Creating..." : "Create Appointment"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {todayAppointments.length} appointments today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Successfully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAppointments.filter(apt => apt.status === 'in-progress').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAppointments.filter(apt => apt.status === 'checked-in').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Patients waiting
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>
                  Manage and track all patient appointments
                </CardDescription>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="table" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient name, doctor, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="checked-in">Checked In</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-[140px]"
                />

                <Button
                  variant="outline"
                  onClick={() => setDateFilter(format(new Date(), "yyyy-MM-dd"))}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Today
                </Button>

                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => {
                          if (sortField === "appointmentDate") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortField("appointmentDate");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        Date & Time
                        {sortField === "appointmentDate" && (
                          <ChevronDown className={`ml-2 h-4 w-4 inline ${sortOrder === "desc" ? "rotate-180" : ""}`} />
                        )}
                      </TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No appointments found</p>
                            <Button
                              variant="outline"
                              onClick={() => setShowAddDialog(true)}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Appointment
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      appointments.map((appointment) => {
                        const statusInfo = statusConfig[appointment.status as keyof typeof statusConfig];
                        const priorityInfo = priorityConfig[appointment.priority as keyof typeof priorityConfig];
                        const StatusIcon = statusInfo?.icon || Calendar;

                        return (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {format(new Date(appointment.appointmentDate), "MMM dd, yyyy")}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {appointment.appointmentTime}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {appointment.patient.firstName} {appointment.patient.lastName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {appointment.patient.phone}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {appointment.staff.firstName} {appointment.staff.lastName}
                                </span>
                                <span className="text-sm text-muted-foreground capitalize">
                                  {appointment.staff.role}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {appointment.staff.department}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`${statusInfo?.color} text-white`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={priorityInfo?.color}
                              >
                                {priorityInfo?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="max-w-[200px] truncate block">
                                {appointment.reason}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {appointment.duration} min
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => openDetailsDialog(appointment)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(appointment)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {appointment.status === 'scheduled' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusUpdate(appointment.id, 'checked-in')}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark Checked In
                                    </DropdownMenuItem>
                                  )}
                                  {appointment.status === 'checked-in' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusUpdate(appointment.id, 'in-progress')}
                                    >
                                      <Clock className="mr-2 h-4 w-4" />
                                      Start Consultation
                                    </DropdownMenuItem>
                                  )}
                                  {appointment.status === 'in-progress' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark Completed
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Cancel
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to cancel this appointment? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(appointment.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Cancel Appointment
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {appointments.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {appointments.length} appointments
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={appointments.length < itemsPerPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
                <p className="text-muted-foreground mb-4">
                  Calendar view is coming soon. Use the table view to manage appointments.
                </p>
                <Button onClick={() => setActiveTab("table")}>
                  Back to Table View
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Appointment</DialogTitle>
              <DialogDescription>
                Update appointment details
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id.toString()}>
                                {patient.firstName} {patient.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="staffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Member</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staff.filter(s => s.role === 'doctor').map((member) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                Dr. {member.firstName} {member.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="15"
                            max="180"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Department</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Visit</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual checkup, Follow-up consultation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes or special instructions"
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Updating..." : "Update Appointment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
              <DialogDescription>
                View detailed information about this appointment
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Patient Information</h4>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}</p>
                      <p><span className="font-medium">Email:</span> {selectedAppointment.patient.email}</p>
                      <p><span className="font-medium">Phone:</span> {selectedAppointment.patient.phone}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Staff Information</h4>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedAppointment.staff.firstName} {selectedAppointment.staff.lastName}</p>
                      <p><span className="font-medium">Role:</span> {selectedAppointment.staff.role}</p>
                      <p><span className="font-medium">Department:</span> {selectedAppointment.staff.department}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Appointment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <p><span className="font-medium">Date:</span> {format(new Date(selectedAppointment.appointmentDate), "PPP")}</p>
                    <p><span className="font-medium">Time:</span> {selectedAppointment.appointmentTime}</p>
                    <p><span className="font-medium">Duration:</span> {selectedAppointment.duration} minutes</p>
                    <p><span className="font-medium">Priority:</span> 
                      <Badge className={`ml-2 ${priorityConfig[selectedAppointment.priority as keyof typeof priorityConfig]?.color}`}>
                        {priorityConfig[selectedAppointment.priority as keyof typeof priorityConfig]?.label}
                      </Badge>
                    </p>
                    <p><span className="font-medium">Status:</span>
                      <Badge className={`ml-2 ${statusConfig[selectedAppointment.status as keyof typeof statusConfig]?.color} text-white`}>
                        {statusConfig[selectedAppointment.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Reason for Visit</h4>
                  <p className="text-gray-700">{selectedAppointment.reason}</p>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <h4 className="font-semibold mb-3">Notes</h4>
                    <p className="text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <p><span className="font-medium">Created:</span> {format(new Date(selectedAppointment.createdAt), "PPpp")}</p>
                  <p><span className="font-medium">Updated:</span> {format(new Date(selectedAppointment.updatedAt), "PPpp")}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
              {selectedAppointment && (
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    openEditDialog(selectedAppointment);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Appointment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}