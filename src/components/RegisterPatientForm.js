"use client";

import { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Check, FileCheck, TriangleAlert, UserRoundPlus, IdCard, FileX2 } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ID_TYPES = [
  { value: "sa_id", label: "South African ID" },
  { value: "passport", label: "Passport" }
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh", 
  "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Denmark", "Egypt", 
  "Finland", "France", "Germany", "Ghana", "Greece", "India", "Indonesia", "Iran", 
  "Iraq", "Ireland", "Israel", "Italy", "Japan", "Kenya", "Malaysia", "Mexico", 
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Philippines", 
  "Poland", "Portugal", "Russia", "Saudi Arabia", "Singapore", "South Africa", 
  "South Korea", "Spain", "Sweden", "Switzerland", "Thailand", "Turkey", 
  "United Kingdom", "United States", "Vietnam", "Zimbabwe"
];

export default function RegisterPatientForm({ onNavigateToDetails, onRegisterAnother }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    id_type: '',
    sa_id_number: '',
    passport_number: '',
    passport_country: '',
    medical_aid: '',
    medical_aid_number: '',
    telegram_user_id: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duplicateModal, setDuplicateModal] = useState({ show: false, matches: [] });
  const [successData, setSuccessData] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const fileInputRef = useRef(null);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required field validation
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.id_type) newErrors.id_type = 'ID type is required';

    // Phone validation (basic South African format)
    if (formData.phone && !/^(\+27|0)[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Email validation - only validate format if email is provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Conditional ID validation
    if (formData.id_type === 'sa_id') {
      if (!formData.sa_id_number.trim()) {
        newErrors.sa_id_number = 'SA ID number is required';
      } else if (!/^[0-9]{13}$/.test(formData.sa_id_number)) {
        newErrors.sa_id_number = 'SA ID must be 13 digits';
      }
    }

    if (formData.id_type === 'passport') {
      if (!formData.passport_number.trim()) newErrors.passport_number = 'Passport number is required';
      if (!formData.passport_country) newErrors.passport_country = 'Passport country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedFile]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, file: 'Only JPG, PNG, and PDF files are allowed' }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
      return;
    }

    setSelectedFile(file);
    setErrors(prev => ({ ...prev, file: '' }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  const checkForDuplicates = useCallback(async () => {
    try {
      const checkData = {
        ...formData,
        checkOnly: true
      };

      const token = localStorage.getItem('bearer_token');
      const response = await fetch('/api/webhook/clinic-portal/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(checkData)
      });

      if (!response.ok) throw new Error('Duplicate check failed');

      const result = await response.json();
      return result.duplicates || [];
    } catch (error) {
      console.error('Duplicate check error:', error);
      return [];
    }
  }, [formData]);

  const submitRegistration = useCallback(async (forceDuplicate = false) => {
    setIsSubmitting(true);
    setUploadProgress(0);
    setSubmitError('');

    try {
      const token = localStorage.getItem('bearer_token');
      
      // Since the API expects JSON, not FormData, let's send JSON
      const registrationData = {
        ...formData,
        forceDuplicate: forceDuplicate ? 'true' : undefined
      };

      // Remove empty fields
      Object.keys(registrationData).forEach(key => {
        if (!registrationData[key]) {
          delete registrationData[key];
        }
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/webhook/clinic-portal/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(registrationData)
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      // Handle specific status codes
      if (response.status === 409) {
        // Duplicate patient found - show modal
        if (result.duplicates && result.duplicates.length > 0) {
          setDuplicateModal({ show: true, matches: result.duplicates });
          setIsSubmitting(false);
          setUploadProgress(0);
          return;
        }
      }

      if (!response.ok) {
        // Handle 400 validation errors specifically
        if (response.status === 400 && result.errors) {
          // Show specific field validation errors
          setErrors(result.errors);
          throw new Error('Please correct the validation errors above');
        }
        throw new Error(result.message || result.error || 'Registration failed');
      }

      setSuccessData(result.patient);
      toast.success('Patient registered successfully!');

    } catch (error) {
      setSubmitError(error.message);
      toast.error('Registration failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitError('Please correct the errors above');
      return;
    }

    // Check for duplicates first
    const duplicates = await checkForDuplicates();
    
    if (duplicates.length > 0) {
      setDuplicateModal({ show: true, matches: duplicates });
      return;
    }

    // No duplicates, proceed with registration
    await submitRegistration();
  }, [validateForm, checkForDuplicates, submitRegistration]);

  const handleDuplicateResolution = useCallback(async (action, patientId = null) => {
    setDuplicateModal({ show: false, matches: [] });

    switch (action) {
      case 'use_existing':
        if (patientId && onNavigateToDetails) {
          onNavigateToDetails(patientId);
        }
        break;
      case 'create_new':
        await submitRegistration(true);
        break;
      case 'cancel':
        // Do nothing
        break;
    }
  }, [submitRegistration, onNavigateToDetails]);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      id_type: '',
      sa_id_number: '',
      passport_number: '',
      passport_country: '',
      medical_aid: '',
      medical_aid_number: '',
      telegram_user_id: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: ''
    });
    setSelectedFile(null);
    setFilePreview(null);
    setErrors({});
    setSuccessData(null);
    setSubmitError('');
  }, []);

  // Success view
  if (successData) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-heading">Registration Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UserRoundPlus className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Patient ID:</span> {successData.id}</div>
              <div><span className="font-medium">Full Name:</span> {successData.firstName} {successData.lastName}</div>
              <div><span className="font-medium">Phone:</span> {successData.phone}</div>
              <div><span className="font-medium">Email:</span> {successData.email || 'Not provided'}</div>
              {successData.address && (
                <div className="md:col-span-2"><span className="font-medium">Address:</span> {successData.address}</div>
              )}
            </div>
          </div>

          {/* Identification Information */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">ID Type:</span> {
                  successData.idType === 'sa_id' ? 'South African ID' : 
                  successData.idType === 'passport' ? 'Passport' : 
                  'Not specified'
                }
              </div>
              {successData.saIdNumber && (
                <div><span className="font-medium">SA ID Number:</span> {successData.saIdNumber}</div>
              )}
              {successData.passportNumber && (
                <>
                  <div><span className="font-medium">Passport Number:</span> {successData.passportNumber}</div>
                  <div><span className="font-medium">Country of Issue:</span> {successData.passportCountry || 'Not specified'}</div>
                </>
              )}
            </div>
          </div>

          {/* Emergency Contact Information */}
          {(successData.emergencyContactName || successData.emergencyContactPhone) && (
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserRoundPlus className="w-4 h-4" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {successData.emergencyContactName && (
                  <div><span className="font-medium">Contact Name:</span> {successData.emergencyContactName}</div>
                )}
                {successData.emergencyContactPhone && (
                  <div><span className="font-medium">Contact Phone:</span> {successData.emergencyContactPhone}</div>
                )}
                {successData.emergencyContactRelationship && (
                  <div><span className="font-medium">Relationship:</span> {successData.emergencyContactRelationship}</div>
                )}
              </div>
            </div>
          )}

          {/* Medical Aid Information */}
          {(successData.medicalAid || successData.medicalAidNumber) && (
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Medical Aid Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {successData.medicalAid && (
                  <div><span className="font-medium">Medical Aid Provider:</span> {successData.medicalAid}</div>
                )}
                {successData.medicalAidNumber && (
                  <div><span className="font-medium">Medical Aid Number:</span> {successData.medicalAidNumber}</div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <FileCheck className="w-4 h-4 mr-2" />
              Print Patient Info
            </Button>
            <Button 
              onClick={() => onNavigateToDetails && onNavigateToDetails(successData.id)}
              className="flex-1"
            >
              Go to Patient Details
            </Button>
          </div>
          
          <Button 
            onClick={() => {
              resetForm();
              onRegisterAnother && onRegisterAnother();
            }}
            variant="secondary" 
            className="w-full"
          >
            <UserRoundPlus className="w-4 h-4 mr-2" />
            Register Another Patient
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-heading">
            <UserRoundPlus className="w-6 h-6" />
            Patient Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert className="mb-6 border-destructive/50 bg-destructive/10">
              <TriangleAlert className="w-4 h-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-destructive' : ''}
                    aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                  />
                  {errors.first_name && (
                    <p id="first_name-error" className="text-sm text-destructive mt-1">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-destructive' : ''}
                    aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                  />
                  {errors.last_name && (
                    <p id="last_name-error" className="text-sm text-destructive mt-1">{errors.last_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="0123456789 or +27123456789"
                    className={errors.phone ? 'border-destructive' : ''}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                  />
                  {errors.phone && (
                    <p id="phone-error" className="text-sm text-destructive mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Optional"
                    className={errors.email ? 'border-destructive' : ''}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Street address, city, postal code (Optional)"
                    className={errors.address ? 'border-destructive' : ''}
                    aria-describedby={errors.address ? 'address-error' : undefined}
                  />
                  {errors.address && (
                    <p id="address-error" className="text-sm text-destructive mt-1">{errors.address}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Emergency Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Full name (Optional)"
                    className={errors.emergency_contact_name ? 'border-destructive' : ''}
                    aria-describedby={errors.emergency_contact_name ? 'emergency_contact_name-error' : undefined}
                  />
                  {errors.emergency_contact_name && (
                    <p id="emergency_contact_name-error" className="text-sm text-destructive mt-1">{errors.emergency_contact_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="0123456789 or +27123456789 (Optional)"
                    className={errors.emergency_contact_phone ? 'border-destructive' : ''}
                    aria-describedby={errors.emergency_contact_phone ? 'emergency_contact_phone-error' : undefined}
                  />
                  {errors.emergency_contact_phone && (
                    <p id="emergency_contact_phone-error" className="text-sm text-destructive mt-1">{errors.emergency_contact_phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="emergency_contact_relationship">Relationship to Patient</Label>
                  <Input
                    id="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                    placeholder="e.g., spouse, parent, sibling, friend (Optional)"
                    className={errors.emergency_contact_relationship ? 'border-destructive' : ''}
                    aria-describedby={errors.emergency_contact_relationship ? 'emergency_contact_relationship-error' : undefined}
                  />
                  {errors.emergency_contact_relationship && (
                    <p id="emergency_contact_relationship-error" className="text-sm text-destructive mt-1">{errors.emergency_contact_relationship}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Identification */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Identification</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="id_type">ID Type *</Label>
                  <Select value={formData.id_type} onValueChange={(value) => handleInputChange('id_type', value)}>
                    <SelectTrigger className={errors.id_type ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.id_type && (
                    <p className="text-sm text-destructive mt-1">{errors.id_type}</p>
                  )}
                </div>

                {formData.id_type === 'sa_id' && (
                  <div>
                    <Label htmlFor="sa_id_number">SA ID Number *</Label>
                    <Input
                      id="sa_id_number"
                      value={formData.sa_id_number}
                      onChange={(e) => handleInputChange('sa_id_number', e.target.value)}
                      placeholder="1234567890123"
                      maxLength={13}
                      className={errors.sa_id_number ? 'border-destructive' : ''}
                      aria-describedby={errors.sa_id_number ? 'sa_id_number-error' : undefined}
                    />
                    {errors.sa_id_number && (
                      <p id="sa_id_number-error" className="text-sm text-destructive mt-1">{errors.sa_id_number}</p>
                    )}
                  </div>
                )}

                {formData.id_type === 'passport' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passport_number">Passport Number *</Label>
                      <Input
                        id="passport_number"
                        value={formData.passport_number}
                        onChange={(e) => handleInputChange('passport_number', e.target.value)}
                        className={errors.passport_number ? 'border-destructive' : ''}
                        aria-describedby={errors.passport_number ? 'passport_number-error' : undefined}
                      />
                      {errors.passport_number && (
                        <p id="passport_number-error" className="text-sm text-destructive mt-1">{errors.passport_number}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="passport_country">Country of Issue *</Label>
                      <Select 
                        value={formData.passport_country} 
                        onValueChange={(value) => handleInputChange('passport_country', value)}
                      >
                        <SelectTrigger className={errors.passport_country ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(country => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.passport_country && (
                        <p className="text-sm text-destructive mt-1">{errors.passport_country}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* File Upload */}
                <div>
                  <Label htmlFor="id_image">ID/Passport Image</Label>
                  <div className="mt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="id_image"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${errors.file ? 'border-destructive bg-destructive/5' : 'border-border hover:border-primary/50 hover:bg-accent'}
                      `}
                    >
                      {selectedFile ? (
                        <div className="space-y-2">
                          {filePreview ? (
                            <img 
                              src={filePreview} 
                              alt="Preview" 
                              className="mx-auto h-20 w-20 object-cover rounded"
                            />
                          ) : (
                            <FileCheck className="mx-auto h-12 w-12 text-green-600" />
                          )}
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Click to upload ID/Passport image (Optional)</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, or PDF up to 10MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.file && (
                      <p className="text-sm text-destructive mt-1">{errors.file}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Aid Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Medical Aid Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medical_aid">Medical Aid Provider</Label>
                  <Input
                    id="medical_aid"
                    value={formData.medical_aid}
                    onChange={(e) => handleInputChange('medical_aid', e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="medical_aid_number">Medical Aid Number</Label>
                  <Input
                    id="medical_aid_number"
                    value={formData.medical_aid_number}
                    onChange={(e) => handleInputChange('medical_aid_number', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Progress Bar during submission */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading patient data...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? 'Registering...' : 'Register Patient'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Duplicate Resolution Modal */}
      <Dialog open={duplicateModal.show} onOpenChange={(open) => !open && setDuplicateModal({ show: false, matches: [] })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="w-5 h-5 text-amber-500" />
              Potential Duplicate Patients Found
            </DialogTitle>
            <DialogDescription>
              We found existing patients with similar information. Please review and choose how to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-60 overflow-y-auto">
            {duplicateModal.matches.map((patient, index) => (
              <Card key={patient.patient_id || index} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold">{patient.first_name} {patient.last_name}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>ID: {patient.patient_id}</p>
                      <p>Phone: {patient.phone}</p>
                      <p>Email: {patient.email}</p>
                      {patient.saIdNumber && <p>SA ID: {patient.saIdNumber}</p>}
                      {patient.passportNumber && <p>Passport: {patient.passportNumber}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateResolution('use_existing', patient.patient_id)}
                  >
                    Use This Patient
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleDuplicateResolution('cancel')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDuplicateResolution('create_new')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Continue and Create New Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}