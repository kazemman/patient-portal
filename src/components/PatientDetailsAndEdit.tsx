"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Save, 
  X, 
  History, 
  Printer, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  CreditCard,
  Shield,
  AlertTriangle,
  Eye,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientId: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  idType: string;
  idNumber: string;
  medicalAidScheme?: string;
  medicalAidNumber?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  idImageUrl?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  patientId: string;
  changes: Record<string, { from: any; to: any }>;
  reason: string;
  changedBy: string;
  changedAt: string;
}

interface PatientDetailsAndEditProps {
  patientId: string;
  onPatientUpdated?: (patient: Patient) => void;
}

export default function PatientDetailsAndEdit({ patientId, onPatientUpdated }: PatientDetailsAndEditProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [changeReason, setChangeReason] = useState('');
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/webhook/clinic-portal/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Patient not found');
        }
        throw new Error(`Failed to fetch patient data: ${response.status}`);
      }

      const data = await response.json();
      setPatient(data);
      setEditForm(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      setError('Failed to load patient information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsAuditLoading(true);
      
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/webhook/clinic-portal/patient/audit?patientId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }

      const data = await response.json();
      setAuditLogs(data.auditHistory || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit history');
    } finally {
      setIsAuditLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleInputChange = useCallback((field: keyof Patient, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    
    if (patient && value !== patient[field]) {
      setHasChanges(true);
    } else if (patient) {
      const otherChanges = Object.keys(editForm).some(key => 
        key !== field && editForm[key as keyof Patient] !== patient[key as keyof Patient]
      );
      setHasChanges(otherChanges);
    }
  }, [patient, editForm]);

  const handleSave = useCallback(async () => {
    if (!changeReason.trim()) {
      toast.error('Please provide a reason for the changes');
      return;
    }

    if (!patient) return;

    try {
      setIsSaving(true);
      
      const changes = Object.keys(editForm).reduce((acc, key) => {
        const field = key as keyof Patient;
        if (editForm[field] !== patient[field]) {
          acc[field] = { from: patient[field], to: editForm[field] };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      const token = localStorage.getItem("bearer_token");
      const response = await fetch('/api/webhook/clinic-portal/patient/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: parseInt(patient.id),
          ...editForm,
          changes,
          reason: changeReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update patient: ${response.status}`);
      }

      const updatedPatient = await response.json();
      setPatient(updatedPatient);
      setEditForm(updatedPatient);
      setIsEditing(false);
      setHasChanges(false);
      setChangeReason('');
      setShowConfirmDialog(false);
      
      toast.success('Patient information updated successfully');
      onPatientUpdated?.(updatedPatient);
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Failed to update patient information');
    } finally {
      setIsSaving(false);
    }
  }, [editForm, patient, changeReason, onPatientUpdated]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setEditForm(patient || {});
        setIsEditing(false);
        setHasChanges(false);
        setChangeReason('');
      }
    } else {
      setEditForm(patient || {});
      setIsEditing(false);
      setChangeReason('');
    }
  }, [hasChanges, patient]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const openAuditDialog = useCallback(() => {
    setShowAuditDialog(true);
    if (auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, [auditLogs.length, fetchAuditLogs]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2 no-print">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPatient}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Patient not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-muted-foreground">Patient ID: {patient.patientId}</p>
        </div>
        
        <div className="flex gap-2 no-print">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={openAuditDialog}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!hasChanges || isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Patient Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={patient.avatarUrl} alt={`${patient.firstName} ${patient.lastName}`} />
                <AvatarFallback className="text-lg">
                  {patient.firstName[0]}{patient.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">
                  {patient.firstName} {patient.lastName}
                </h3>
                <p className="text-muted-foreground">ID: {patient.patientId}</p>
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={editForm.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">{patient.firstName}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={editForm.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md">{patient.lastName}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {patient.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editForm.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {patient.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                {isEditing ? (
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={editForm.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                {isEditing ? (
                  <Select
                    value={editForm.gender || ''}
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-muted rounded-md capitalize">{patient.gender}</div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address Information
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={editForm.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-md">{patient.address}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        value={editForm.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-md">{patient.city}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    {isEditing ? (
                      <Input
                        id="province"
                        value={editForm.province || ''}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-md">{patient.province}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        id="postalCode"
                        value={editForm.postalCode || ''}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-md">{patient.postalCode}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* ID Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                ID Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">ID Type</Label>
                <Badge variant="secondary" className="ml-2">
                  {patient.idType}
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium">ID Number</Label>
                <p className="font-mono text-sm mt-1">{patient.idNumber}</p>
              </div>

              {patient.idImageUrl && (
                <div>
                  <Label className="text-sm font-medium">ID Document</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full no-print"
                    onClick={() => setShowImageDialog(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View ID Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical Aid Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Medical Aid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patient.medicalAidScheme ? (
                <>
                  <div>
                    <Label className="text-sm font-medium">Scheme</Label>
                    <Badge variant="outline" className="ml-2">
                      {patient.medicalAidScheme}
                    </Badge>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Member Number</Label>
                    <p className="font-mono text-sm mt-1">{patient.medicalAidNumber}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No medical aid information</p>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="mt-1">{patient.emergencyContactName}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="font-mono text-sm mt-1">{patient.emergencyContactPhone}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Changes Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide a reason for these changes:</p>
            <Textarea
              placeholder="Enter reason for changes..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!changeReason.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit History Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Patient History
            </DialogTitle>
          </DialogHeader>
          
          {isAuditLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.changedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.changedBy}</TableCell>
                      <TableCell>{log.reason}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Object.entries(log.changes).map(([field, change]) => (
                            <div key={field} className="text-sm">
                              <span className="font-medium">{field}:</span>
                              <span className="text-muted-foreground ml-1">
                                "{change.from}" → "{change.to}"
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No audit history available for this patient.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ID Image Lightbox */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>ID Document</DialogTitle>
          </DialogHeader>
          {patient.idImageUrl && (
            <div className="flex justify-center">
              <img
                src={patient.idImageUrl}
                alt="ID Document"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}