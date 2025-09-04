"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Search, User, CreditCard, Clock, CheckCircle, AlertCircle, Phone, Mail, IdCard, Shield, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  idType: string;
  saIdNumber: string;
  passportNumber: string;
  passportCountry: string;
  medicalAid: string;
  medicalAidNumber: string;
  active: boolean;
}

interface Appointment {
  id: number;
  patientId: number;
  appointmentDatetime: string;
  durationMinutes: number;
  reason: string;
  notes: string;
  status: string;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    idType: string;
    saIdNumber: string;
    passportNumber: string;
    passportCountry: string;
    medicalAid: string;
    medicalAidNumber: string;
  };
}

interface CheckinResponse {
  id: number;
  patientId: number;
  checkinTime: string;
  paymentMethod: string;
  status: string;
  notes: string;
  amount: number | null;
  patient: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    medicalAid: string;
    medicalAidNumber: string;
  };
}

type Step = 'search' | 'confirm' | 'payment' | 'complete';
type PaymentMethod = 'medical_aid' | 'cash' | 'both';
type CheckinMode = 'appointment' | 'walkin';

const paymentMethodColors = {
  medical_aid: 'bg-green-100 text-green-800 border-green-200',
  cash: 'bg-blue-100 text-blue-800 border-blue-200',
  both: 'bg-orange-100 text-orange-800 border-orange-200'
};

const paymentMethodLabels = {
  medical_aid: 'Medical Aid',
  cash: 'Cash',
  both: 'Both'
};

const appointmentStatusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800'
};

export const PatientCheckin = () => {
  const [checkinMode, setCheckinMode] = useState<CheckinMode>('appointment');
  const [currentStep, setCurrentStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');

  // Fetch today's appointments
  const fetchTodayAppointments = useCallback(async () => {
    setIsLoadingAppointments(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/webhook/clinic-portal/appointment/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTodayAppointments(data.appointments || []);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to load appointments: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Error loading today\'s appointments');
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  // Load appointments on mount when in appointment mode
  useEffect(() => {
    if (checkinMode === 'appointment') {
      fetchTodayAppointments();
    }
  }, [checkinMode, fetchTodayAppointments]);

  // Search patients function (for walk-in mode)
  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        let errorMessage = 'Search failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSearchResults(data.patients || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect (only for walk-in mode)
  useEffect(() => {
    if (checkinMode === 'walkin') {
      const timeoutId = setTimeout(() => {
        searchPatients(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, searchPatients, checkinMode]);

  // Handle patient selection (walk-in mode)
  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedAppointment(null);
    setCurrentStep('confirm');
  };

  // Handle appointment selection (appointment mode)
  const handleAppointmentSelect = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedPatient(appointment.patient);
    setCurrentStep('confirm');
  };

  // Handle payment method selection and validation
  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    
    // Reset amount when switching payment methods
    if (method === 'medical_aid') {
      setAmount('');
    }
    
    // Validate medical aid requirements
    if ((method === 'medical_aid' || method === 'both') && selectedPatient) {
      if (!selectedPatient.medicalAid || !selectedPatient.medicalAidNumber) {
        toast.error('Patient must have medical aid information for this payment method');
        return;
      }
    }
    
    setCurrentStep('payment');
  };

  // Handle check-in submission
  const handleCheckin = async () => {
    if (!selectedPatient || !paymentMethod) return;

    // Validate amount for cash/both payment methods
    if ((paymentMethod === 'cash' || paymentMethod === 'both') && !amount.trim()) {
      toast.error('Amount is required for cash payments');
      return;
    }

    // Validate amount format
    if ((paymentMethod === 'cash' || paymentMethod === 'both') && amount.trim()) {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }
      if (numericAmount > 999999.99) {
        toast.error('Amount cannot exceed R999,999.99');
        return;
      }
    }

    setIsCheckingIn(true);

    try {
      const checkinData: any = {
        patient_id: selectedPatient.id,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      // Add amount for cash/both payment methods
      if ((paymentMethod === 'cash' || paymentMethod === 'both') && amount.trim()) {
        checkinData.amount = parseFloat(amount);
      }

      // Add appointment ID if checking in from appointment
      if (selectedAppointment) {
        checkinData.appointment_id = selectedAppointment.id;
      }

      const response = await fetch('/api/webhook/clinic-portal/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkinData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessages = {
          MISSING_PATIENT_ID: 'Patient ID is required',
          INVALID_PAYMENT_METHOD: 'Invalid payment method selected',
          PATIENT_NOT_FOUND: 'Patient not found or inactive',
          MISSING_MEDICAL_AID_INFO: 'Patient must have medical aid information for this payment method',
          DUPLICATE_CHECKIN: 'Patient is already checked in and waiting',
          MISSING_AMOUNT: 'Amount is required for cash payments',
          INVALID_AMOUNT: 'Please enter a valid amount',
          AMOUNT_TOO_LARGE: 'Amount cannot exceed R999,999.99',
        };

        const errorMessage = errorMessages[data.code as keyof typeof errorMessages] || data.error || 'Check-in failed';
        toast.error(errorMessage);
        return;
      }

      setCheckinResult(data);
      setCurrentStep('complete');
      
      const appointmentText = selectedAppointment ? ' for their appointment' : '';
      const amountText = data.amount ? ` (Amount: R${data.amount.toFixed(2)})` : '';
      toast.success(`${selectedPatient.firstName} ${selectedPatient.lastName} has been checked in${appointmentText}!${amountText}`);

      // Refresh appointments list if in appointment mode
      if (checkinMode === 'appointment') {
        fetchTodayAppointments();
      }

    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in patient. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Reset to start new check-in
  const handleNewCheckin = () => {
    setCurrentStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(null);
    setSelectedAppointment(null);
    setPaymentMethod('');
    setNotes('');
    setAmount('');
    setCheckinResult(null);
    setSearchError(null);
  };

  // Format appointment time
  const formatAppointmentTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get ID display value
  const getIdDisplay = (patient: Patient) => {
    if (patient.idType === 'sa_id') {
      return patient.saIdNumber || 'N/A';
    }
    return `${patient.passportNumber || 'N/A'} (${patient.passportCountry || 'Unknown'})`;
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[
        { step: 'search', label: checkinMode === 'appointment' ? 'Select' : 'Search', icon: checkinMode === 'appointment' ? Calendar : Search },
        { step: 'confirm', label: 'Confirm', icon: User },
        { step: 'payment', label: 'Payment', icon: CreditCard },
        { step: 'complete', label: 'Complete', icon: CheckCircle },
      ].map(({ step, label, icon: Icon }, index) => {
        const isActive = currentStep === step;
        const isCompleted = ['search', 'confirm', 'payment', 'complete'].indexOf(currentStep) > index;
        
        return (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
              isActive 
                ? 'bg-primary text-primary-foreground border-primary' 
                : isCompleted 
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
            }`}>
              {label}
            </span>
            {index < 3 && (
              <div className={`w-8 h-0.5 mx-4 ${
                isCompleted ? 'bg-green-500' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Patient Check-In</h1>
        <p className="text-muted-foreground">Check in patients with appointments or walk-ins</p>
      </div>

      {/* Mode Selection - Only show on search step */}
      {currentStep === 'search' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <Tabs value={checkinMode} onValueChange={(value) => setCheckinMode(value as CheckinMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="appointment" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Appointment Check-In
                </TabsTrigger>
                <TabsTrigger value="walkin" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Walk-In Check-In
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <StepIndicator />

      {/* Search/Select Step */}
      {currentStep === 'search' && (
        <>
          {/* Appointment Mode - Show today's appointments */}
          {checkinMode === 'appointment' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Appointments
                </CardTitle>
                <CardDescription>
                  Select a patient with a scheduled appointment to check them in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAppointments && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading appointments...</span>
                  </div>
                )}

                {!isLoadingAppointments && todayAppointments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled appointments for today</p>
                    <p className="text-sm">Switch to walk-in mode to check in patients without appointments</p>
                  </div>
                )}

                {!isLoadingAppointments && todayAppointments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Scheduled Appointments ({todayAppointments.length})
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {todayAppointments.map((appointment) => (
                        <Card 
                          key={appointment.id} 
                          className="cursor-pointer hover:bg-accent/50 transition-colors" 
                          onClick={() => handleAppointmentSelect(appointment)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">
                                    {appointment.patient.firstName} {appointment.patient.lastName}
                                  </h5>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatAppointmentTime(appointment.appointmentDatetime)}
                                  </Badge>
                                  {appointment.patient.medicalAid && (
                                    <Badge variant="outline" className="text-xs">
                                      <Shield className="w-3 h-3 mr-1" />
                                      {appointment.patient.medicalAid}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <p>Reason: {appointment.reason}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    {appointment.patient.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {appointment.patient.phone}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {appointment.durationMinutes} minutes
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Check In
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Walk-in Mode - Patient Search */}
          {checkinMode === 'walkin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Patient
                </CardTitle>
                <CardDescription>
                  Search by name, phone number, SA ID, or patient ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter patient name, phone, SA ID, or patient ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Searching...</span>
                  </div>
                )}

                {searchError && (
                  <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-destructive">{searchError}</span>
                  </div>
                )}

                {searchResults.length > 0 && !isSearching && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Search Results ({searchResults.length})</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {searchResults.map((patient) => (
                        <Card key={patient.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handlePatientSelect(patient)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">{patient.firstName} {patient.lastName}</h5>
                                  {patient.medicalAid && (
                                    <Badge variant="outline" className="text-xs">
                                      <Shield className="w-3 h-3 mr-1" />
                                      {patient.medicalAid}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {patient.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {patient.phone}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <IdCard className="w-3 h-3" />
                                    {getIdDisplay(patient)}
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Select
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && !searchError && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No patients found matching your search</p>
                    <p className="text-sm">Try searching with a different term</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Confirm Step */}
      {currentStep === 'confirm' && selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Confirm Patient Details
            </CardTitle>
            <CardDescription>
              Please verify the patient information before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Show appointment details if checking in from appointment */}
            {selectedAppointment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Appointment Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Time: </span>
                    <span className="text-blue-800">{formatAppointmentTime(selectedAppointment.appointmentDatetime)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Duration: </span>
                    <span className="text-blue-800">{selectedAppointment.durationMinutes} minutes</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-700 font-medium">Reason: </span>
                    <span className="text-blue-800">{selectedAppointment.reason}</span>
                  </div>
                  {selectedAppointment.notes && (
                    <div className="col-span-2">
                      <span className="text-blue-700 font-medium">Notes: </span>
                      <span className="text-blue-800">{selectedAppointment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                  <p className="text-lg font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                </div>
                
                {selectedPatient.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p>{selectedPatient.phone}</p>
                    </div>
                  </div>
                )}

                {selectedPatient.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p>{selectedPatient.email}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Information</label>
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-muted-foreground" />
                    <p>{getIdDisplay(selectedPatient)}</p>
                  </div>
                </div>

                {selectedPatient.medicalAid && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Medical Aid</label>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium">{selectedPatient.medicalAid}</p>
                        {selectedPatient.medicalAidNumber && (
                          <p className="text-sm text-muted-foreground">{selectedPatient.medicalAidNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('search')}>
                Back to {checkinMode === 'appointment' ? 'Appointments' : 'Search'}
              </Button>
              <Button onClick={() => setCurrentStep('payment')}>
                Confirm & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Step */}
      {currentStep === 'payment' && selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Select Payment Method
            </CardTitle>
            <CardDescription>
              Choose how the patient will pay for their consultation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['medical_aid', 'cash', 'both'] as PaymentMethod[]).map((method) => {
                const isDisabled = (method === 'medical_aid' || method === 'both') && 
                  (!selectedPatient.medicalAid || !selectedPatient.medicalAidNumber);
                
                return (
                  <Card 
                    key={method}
                    className={`cursor-pointer transition-all border-2 ${
                      paymentMethod === method 
                        ? 'border-primary bg-primary/5' 
                        : isDisabled 
                        ? 'border-muted bg-muted/30 cursor-not-allowed opacity-50'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => !isDisabled && handlePaymentMethodSelect(method)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${paymentMethodColors[method]}`}>
                        {paymentMethodLabels[method]}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {method === 'medical_aid' && 'Patient pays with medical aid'}
                        {method === 'cash' && 'Patient pays cash for consultation'}
                        {method === 'both' && 'Medical aid + cash top-up'}
                      </p>
                      {isDisabled && (
                        <p className="text-xs text-destructive mt-2">
                          Medical aid information required
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {paymentMethod && (
              <div className="space-y-4">
                {/* Amount Field - Show for cash or both */}
                {(paymentMethod === 'cash' || paymentMethod === 'both') && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Amount (South African Rands) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">R</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-8"
                        min="0"
                        max="999999.99"
                        step="0.01"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {paymentMethod === 'cash' && 'Enter the cash amount to be paid'}
                      {paymentMethod === 'both' && 'Enter the cash portion (top-up amount)'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Notes (Optional)
                  </label>
                  <Input
                    placeholder="Add any notes about this check-in..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('confirm')}>
                    Back
                  </Button>
                  <Button onClick={handleCheckin} disabled={isCheckingIn}>
                    {isCheckingIn ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking In...
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Check In Patient
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {currentStep === 'complete' && checkinResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Check-In Complete
            </CardTitle>
            <CardDescription>
              Patient has been successfully added to the queue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">
                    {checkinResult.patient.firstName} {checkinResult.patient.lastName} is now in the queue
                  </h3>
                  <p className="text-sm text-green-700">
                    Check-in ID: #{checkinResult.id}
                  </p>
                  <p className="text-sm text-green-700">
                    Payment Method: {paymentMethodLabels[checkinResult.paymentMethod as PaymentMethod]}
                  </p>
                  {checkinResult.amount && (
                    <p className="text-sm text-green-700">
                      Amount: R{checkinResult.amount.toFixed(2)}
                    </p>
                  )}
                  <p className="text-sm text-green-700">
                    Time: {new Date(checkinResult.checkinTime).toLocaleString()}
                  </p>
                  {selectedAppointment && (
                    <p className="text-sm text-green-700">
                      Appointment Time: {formatAppointmentTime(selectedAppointment.appointmentDatetime)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {checkinResult.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-sm bg-muted p-3 rounded-lg mt-1">{checkinResult.notes}</p>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={handleNewCheckin} size="lg">
                Check In Another Patient
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};