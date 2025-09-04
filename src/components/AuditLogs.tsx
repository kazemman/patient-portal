"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Logs, 
  ListFilter, 
  SearchX, 
  History, 
  FileDiff, 
  Undo, 
  ChevronsLeftRight, 
  Ellipsis,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Eye
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  changedBy: string;
  fieldsChanged: string[];
  oldValue: any;
  newValue: any;
  reason?: string;
  metadata?: any;
}

interface FilterState {
  patient_id: string;
  changed_by: string;
  date_from: string;
  date_to: string;
  field_changed: string;
  search: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
}

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: 25
  });

  const [filters, setFilters] = useState<FilterState>({
    patient_id: '',
    changed_by: '',
    date_from: '',
    date_to: '',
    field_changed: '',
    search: ''
  });

  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // Check permissions first
  const checkPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch('/api/webhook/clinic-portal/audit-logs/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasPermission(data.hasPermission);
      } else {
        setHasPermission(false);
      }
    } catch (err) {
      console.error('Permission check error:', err);
      setHasPermission(false);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (hasPermission === false) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("bearer_token");
      
      // Filter out empty values and "all" values, and validate patient_id
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => {
          if (!value || value === '' || value === 'all') return false;
          
          // Validate patient_id is numeric
          if (key === 'patient_id' && isNaN(parseInt(value))) {
            throw new Error('Patient ID must be a valid number');
          }
          
          return true;
        })
      );

      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.pageSize.toString(),
        ...cleanFilters
      });

      console.log('Fetching audit logs with params:', queryParams.toString());

      const response = await fetch(`/api/webhook/clinic-portal/audit-logs?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setPagination({
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        totalRecords: data.totalRecords || 0,
        pageSize: data.pageSize || 25
      });

      // Extract unique users and fields for filter dropdowns
      if (data.logs && data.logs.length > 0) {
        const users = [...new Set(data.logs.map((log: AuditLogEntry) => log.changedBy))];
        const fields = [...new Set(data.logs.flatMap((log: AuditLogEntry) => log.fieldsChanged))];
        setAvailableUsers(users);
        setAvailableFields(fields);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(`Failed to fetch audit logs: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [hasPermission, pagination.currentPage, pagination.pageSize, filters]);

  // Initialize permissions and data
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    if (hasPermission === true) {
      fetchAuditLogs();
    }
  }, [hasPermission, fetchAuditLogs]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      patient_id: '',
      changed_by: '',
      date_from: '',
      date_to: '',
      field_changed: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  }, []);

  // Navigate to patient
  const navigateToPatient = useCallback((patientId: string) => {
    window.dispatchEvent(new CustomEvent('navigateToPatient', { 
      detail: { patientId } 
    }));
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (auditLogs.length === 0) return;

    const headers = [
      'Timestamp',
      'Patient ID',
      'Patient Name',
      'Changed By',
      'Fields Changed',
      'Old Value',
      'New Value',
      'Reason'
    ];

    const csvContent = [
      headers.join(','),
      ...auditLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.patientId,
        `"${log.patientName}"`,
        `"${log.changedBy}"`,
        `"${log.fieldsChanged.join(', ')}"`,
        `"${JSON.stringify(log.oldValue)}"`,
        `"${JSON.stringify(log.newValue)}"`,
        `"${log.reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [auditLogs]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format field changes
  const formatFieldChanges = (fields: string[]) => {
    return fields.map(field => (
      <Badge key={field} variant="outline" className="mr-1 mb-1">
        {field}
      </Badge>
    ));
  };

  // Permission denied view
  if (hasPermission === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access audit logs. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Loading view
  if (hasPermission === null || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Logs className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">Audit Logs</h1>
                <p className="text-muted-foreground">Track and monitor all system changes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFiltersVisible(!filtersVisible)}
                className="gap-2"
              >
                <ListFilter className="h-4 w-4" />
                Filters
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={auditLogs.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        {filtersVisible && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListFilter className="h-5 w-5" />
                Filter Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Patient ID</label>
                  <Input
                    placeholder="Enter patient ID"
                    value={filters.patient_id}
                    onChange={(e) => handleFilterChange('patient_id', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Changed By</label>
                  <Select
                    value={filters.changed_by}
                    onValueChange={(value) => handleFilterChange('changed_by', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {availableUsers.map(user => (
                        <SelectItem key={user} value={user}>{user}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Field Changed</label>
                  <Select
                    value={filters.field_changed}
                    onValueChange={(value) => handleFilterChange('field_changed', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fields</SelectItem>
                      {availableFields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date From</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date To</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search in all fields..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={clearFilters} variant="outline" className="gap-2">
                  <SearchX className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Entries ({pagination.totalRecords})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
                <p className="text-muted-foreground">
                  No audit logs match your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Fields Changed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <button
                                onClick={() => navigateToPatient(log.patientId)}
                                className="text-primary hover:underline font-medium text-left"
                              >
                                {log.patientName}
                              </button>
                              <div className="text-xs text-muted-foreground">
                                ID: {log.patientId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{log.changedBy}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formatFieldChanges(log.fieldsChanged)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)} of{' '}
                      {pagination.totalRecords} entries
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={pagination.currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={selectedLog !== null} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileDiff className="h-5 w-5" />
                Audit Log Details
              </DialogTitle>
              <DialogDescription>
                Detailed view of the audit log entry
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="font-mono text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Changed By</label>
                    <p>{selectedLog.changedBy}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Patient</label>
                    <button
                      onClick={() => navigateToPatient(selectedLog.patientId)}
                      className="text-primary hover:underline text-left"
                    >
                      {selectedLog.patientName} ({selectedLog.patientId})
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Fields Changed</label>
                    <div className="flex flex-wrap gap-1">
                      {formatFieldChanges(selectedLog.fieldsChanged)}
                    </div>
                  </div>
                </div>

                {/* Changes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Changes Made</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Previous Value</label>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">New Value</label>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {selectedLog.reason && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Reason</label>
                    <p className="p-3 bg-muted rounded-lg">{selectedLog.reason}</p>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Additional Information</label>
                    <div className="p-3 bg-muted rounded-lg">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}