"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar as CalendarIcon,
  Eye,
  Activity,
  Shield,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'warning';
  details?: string;
  metadata?: Record<string, any>;
}

interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  user: string;
  action: string;
  resource: string;
  search: string;
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    userId: "staff-1",
    userName: "Dr. Sarah Johnson",
    userRole: "Doctor",
    action: "VIEW",
    resource: "PATIENT",
    resourceId: "patient-123",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    status: "success",
    details: "Viewed patient medical record",
    metadata: { patientName: "John Doe", recordId: "medical-456" }
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    userId: "staff-2",
    userName: "Nurse Mary Wilson",
    userRole: "Nurse",
    action: "UPDATE",
    resource: "APPOINTMENT",
    resourceId: "apt-789",
    ipAddress: "192.168.1.101",
    status: "success",
    details: "Updated appointment status to completed",
    metadata: { appointmentId: "apt-789", oldStatus: "scheduled", newStatus: "completed" }
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    userId: "admin-1",
    userName: "Admin User",
    userRole: "Administrator",
    action: "DELETE",
    resource: "USER",
    resourceId: "user-456",
    ipAddress: "192.168.1.102",
    status: "failed",
    details: "Failed to delete user - insufficient permissions",
    metadata: { reason: "Access denied", targetUser: "staff-3" }
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    userId: "staff-3",
    userName: "Dr. Michael Brown",
    userRole: "Doctor",
    action: "LOGIN",
    resource: "SYSTEM",
    ipAddress: "192.168.1.103",
    status: "warning",
    details: "Login from unusual location",
    metadata: { location: "Unknown", previousLocation: "Office Network" }
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    userId: "staff-1",
    userName: "Dr. Sarah Johnson",
    userRole: "Doctor",
    action: "EXPORT",
    resource: "REPORT",
    resourceId: "report-123",
    ipAddress: "192.168.1.100",
    status: "success",
    details: "Exported patient data report",
    metadata: { reportType: "Monthly Summary", format: "PDF" }
  }
];

export default function AuditLogsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: subDays(new Date(), 7),
      to: new Date()
    },
    user: "",
    action: "",
    resource: "",
    search: ""
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/clinic/audit-logs", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs || MOCK_AUDIT_LOGS);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setLogs(MOCK_AUDIT_LOGS);
      toast.error("Failed to fetch audit logs. Showing mock data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter logs based on current filters
  useEffect(() => {
    let filtered = [...logs];

    // Date range filter
    if (filters.dateRange.from && filters.dateRange.to) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startOfDay(filters.dateRange.from!) && 
               logDate <= endOfDay(filters.dateRange.to!);
      });
    }

    // User filter
    if (filters.user) {
      filtered = filtered.filter(log => 
        log.userId === filters.user || log.userName.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    // Action filter
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    // Resource filter
    if (filters.resource) {
      filtered = filtered.filter(log => log.resource === filters.resource);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.userName.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower) ||
        log.ipAddress.includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, filters]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAuditLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAuditLogs]);

  // Initial data load
  useEffect(() => {
    if (session?.user) {
      fetchAuditLogs();
    }
  }, [session, fetchAuditLogs]);

  // Calculate stats
  const stats = {
    totalLogs: logs.length,
    todayActivity: logs.filter(log => {
      const today = new Date();
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === today.toDateString();
    }).length,
    failedActions: logs.filter(log => log.status === 'failed').length,
    securityEvents: logs.filter(log => 
      log.action === 'LOGIN' || log.status === 'warning' || log.status === 'failed'
    ).length
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Export functionality
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Mock export functionality
    toast.success(`Exporting ${filteredLogs.length} logs as ${format.toUpperCase()}...`);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Warning</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get unique values for dropdowns
  const uniqueUsers = [...new Set(logs.map(log => log.userName))];
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueResources = [...new Set(logs.map(log => log.resource))];

  if (isPending || !session?.user) {
    return (
      <AppLayout isPatientPortal={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isPatientPortal={false}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">Monitor system activity and security events</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
            </div>
            <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayActivity}</div>
              <p className="text-xs text-muted-foreground">Actions performed today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failedActions}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.securityEvents}</div>
              <p className="text-xs text-muted-foreground">Login & security alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange.from}
                      selected={filters.dateRange}
                      onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range || { from: undefined, to: undefined } }))}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <Label>User</Label>
                <Select
                  value={filters.user}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {uniqueUsers.map(user => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Filter */}
              <div className="space-y-2">
                <Label>Resource</Label>
                <Select
                  value={filters.resource}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, resource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All resources</SelectItem>
                    {uniqueResources.map(resource => (
                      <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters & Export */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    dateRange: { from: subDays(new Date(), 7), to: new Date() },
                    user: "",
                    action: "",
                    resource: "",
                    search: ""
                  })}
                >
                  Clear Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} logs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value) => handleExport(value as 'csv' | 'excel' | 'pdf')}>
                  <SelectTrigger className="w-32">
                    <Download className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Detailed system activity and security events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Activity className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No audit logs found</p>
                            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.userName}</div>
                              <div className="text-sm text-muted-foreground">{log.userRole}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.resource}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-32">{log.details}</span>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedLog(log)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Audit Log Details</DialogTitle>
                                    <DialogDescription>
                                      Log ID: {log.id}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium">Timestamp</Label>
                                        <p className="text-sm font-mono">{format(new Date(log.timestamp), "PPpp")}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Status</Label>
                                        <div className="mt-1">{getStatusBadge(log.status)}</div>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">User</Label>
                                        <p className="text-sm">{log.userName} ({log.userRole})</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Action</Label>
                                        <p className="text-sm">{log.action}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Resource</Label>
                                        <p className="text-sm">{log.resource}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">IP Address</Label>
                                        <p className="text-sm font-mono">{log.ipAddress}</p>
                                      </div>
                                    </div>
                                    {log.details && (
                                      <div>
                                        <Label className="text-sm font-medium">Details</Label>
                                        <p className="text-sm mt-1">{log.details}</p>
                                      </div>
                                    )}
                                    {log.userAgent && (
                                      <div>
                                        <Label className="text-sm font-medium">User Agent</Label>
                                        <p className="text-sm font-mono mt-1 break-all">{log.userAgent}</p>
                                      </div>
                                    )}
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                      <div>
                                        <Label className="text-sm font-medium">Metadata</Label>
                                        <pre className="text-sm bg-muted p-3 rounded mt-1 overflow-auto">
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page-size" className="text-sm">Rows per page:</Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(parseInt(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
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
    </AppLayout>
  );
}