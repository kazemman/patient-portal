"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit2, 
  Archive, 
  FileText, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

// Validation schema
const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
  emergencyContact: z.string().min(1, 'Emergency contact is required'),
  insuranceInfo: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    groupNumber: z.string().optional()
  }).optional()
});

type PatientFormData = z.infer<typeof patientSchema>;

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
  };
  registrationDate: string;
  status: 'active' | 'inactive' | 'archived';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PatientManagementPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      insuranceInfo: {
        provider: '',
        policyNumber: '',
        groupNumber: ''
      }
    }
  });

  // Stats
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.status === 'active').length;
    const inactivePatients = patients.filter(p => p.status === 'inactive').length;
    const archivedPatients = patients.filter(p => p.status === 'archived').length;

    return {
      total: totalPatients,
      active: activePatients,
      inactive: inactivePatients,
      archived: archivedPatients
    };
  }, [patients]);

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('bearer_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sort: sortBy,
        order: sortOrder
      });

      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/clinic/patients?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data);
      
      // Calculate total pages (simplified - in real app would come from API)
      const totalItems = data.length === itemsPerPage ? currentPage * itemsPerPage + 1 : (currentPage - 1) * itemsPerPage + data.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, sortBy, sortOrder, router]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle form submission for adding/editing patients
  const handleSubmit = async (data: PatientFormData) => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('bearer_token');

      const payload = {
        ...data,
        insuranceInfo: data.insuranceInfo && (
          data.insuranceInfo.provider || 
          data.insuranceInfo.policyNumber || 
          data.insuranceInfo.groupNumber
        ) ? data.insuranceInfo : null
      };

      const url = selectedPatient 
        ? `/api/clinic/patients?id=${selectedPatient.id}` 
        : '/api/clinic/patients';
      
      const method = selectedPatient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save patient');
      }

      toast.success(selectedPatient ? 'Patient updated successfully' : 'Patient created successfully');
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedPatient(null);
      form.reset();
      fetchPatients();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle patient archiving
  const handleArchivePatient = async () => {
    if (!selectedPatient) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('bearer_token');

      const response = await fetch(`/api/clinic/patients?id=${selectedPatient.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to archive patient');
      }

      toast.success('Patient archived successfully');
      setShowArchiveModal(false);
      setSelectedPatient(null);
      fetchPatients();

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export patients
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('bearer_token');
      const response = await fetch('/api/clinic/patients?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to export patients');

      const data = await response.json();
      const csv = [
        ['Name', 'Email', 'Phone', 'Date of Birth', 'Status', 'Registration Date'].join(','),
        ...data.map((p: Patient) => [
          `"${p.firstName} ${p.lastName}"`,
          p.email,
          p.phone,
          p.dateOfBirth,
          p.status,
          new Date(p.registrationDate).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Patients exported successfully');
    } catch (err) {
      toast.error('Failed to export patients');
    }
  };

  // Handle edit patient
  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    form.reset({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      emergencyContact: patient.emergencyContact,
      insuranceInfo: patient.insuranceInfo || {
        provider: '',
        policyNumber: '',
        groupNumber: ''
      }
    });
    setShowEditModal(true);
  };

  // Handle view patient
  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  // Handle archive patient
  const handleShowArchiveModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowArchiveModal(true);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variant = status === 'active' ? 'default' : 
                   status === 'inactive' ? 'secondary' : 
                   'destructive';
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <AppLayout isPatientPortal={false}>
        <div className="flex items-center justify-center h-96">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Loading Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchPatients} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patient Management</h1>
            <p className="text-muted-foreground">
              Manage patient records, registrations, and information
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived</CardTitle>
              <Archive className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.archived}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Directory</CardTitle>
            <CardDescription>
              Search and filter patient records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firstName-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="firstName-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="registrationDate-desc">Newest First</SelectItem>
                  <SelectItem value="registrationDate-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Date of Birth</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No patients found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        patients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {patient.firstName} {patient.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {patient.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {patient.phone}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {patient.address.length > 30 
                                    ? `${patient.address.substring(0, 30)}...` 
                                    : patient.address}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(patient.dateOfBirth).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(patient.registrationDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={patient.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewPatient(patient)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditPatient(patient)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Patient
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/patients/${patient.id}/medical-records`)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Medical Records
                                  </DropdownMenuItem>
                                  {patient.status !== 'archived' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleShowArchiveModal(patient)}
                                      className="text-destructive"
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive Patient
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {patients.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, patients.length)} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Patient Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedPatient(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPatient ? 'Edit Patient' : 'Add New Patient'}
            </DialogTitle>
            <DialogDescription>
              {selectedPatient 
                ? 'Update patient information below' 
                : 'Fill in the patient information below'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
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
                  control={form.control}
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
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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

              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Name - Phone Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Insurance Information (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="insuranceInfo.provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insuranceInfo.policyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="insuranceInfo.groupNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedPatient(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : selectedPatient ? 'Update Patient' : 'Add Patient'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Patient Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              Complete patient information
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Name</h4>
                  <p>{selectedPatient.firstName} {selectedPatient.lastName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                  <StatusBadge status={selectedPatient.status} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Email</h4>
                  <p>{selectedPatient.email}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Phone</h4>
                  <p>{selectedPatient.phone}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Date of Birth</h4>
                <p>{new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Address</h4>
                <p>{selectedPatient.address}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Emergency Contact</h4>
                <p>{selectedPatient.emergencyContact}</p>
              </div>

              {selectedPatient.insuranceInfo && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Insurance Information</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    {selectedPatient.insuranceInfo.provider && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Provider:</span>
                        <span className="text-sm">{selectedPatient.insuranceInfo.provider}</span>
                      </div>
                    )}
                    {selectedPatient.insuranceInfo.policyNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Policy Number:</span>
                        <span className="text-sm">{selectedPatient.insuranceInfo.policyNumber}</span>
                      </div>
                    )}
                    {selectedPatient.insuranceInfo.groupNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Group Number:</span>
                        <span className="text-sm">{selectedPatient.insuranceInfo.groupNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium">Registration Date</h4>
                  <p>{new Date(selectedPatient.registrationDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-medium">Last Updated</h4>
                  <p>{new Date(selectedPatient.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewModal(false);
              if (selectedPatient) handleEditPatient(selectedPatient);
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Modal */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this patient? This action will mark the patient as inactive but preserve all records.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleArchivePatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Archiving...' : 'Archive Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}