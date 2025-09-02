"use client";

import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import PatientDetailsAndEdit from '@/components/PatientDetailsAndEdit';
import AuditLogs from '@/components/AuditLogs';
import { PatientCheckin } from '@/components/PatientCheckIn';
import { QueueDashboard } from '@/components/QueueDashboard';
import { CheckInStats } from '@/components/CheckInStats';
import { UserManagement } from '@/components/UserManagement';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [clinicStats, setClinicStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    waitingPatients: 0,
    completedToday: 0
  });
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data and verify authentication
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('bearer_token');
        const userData = localStorage.getItem('user_data');

        if (!token) {
          router.push('/login');
          return;
        }

        // Parse stored user data for immediate UI update
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser({
              name: parsedUser.fullName,
              role: parsedUser.role,
              email: parsedUser.email
            });
          } catch (error) {
            console.error('Failed to parse user data:', error);
          }
        }

        // Verify token with server
        const response = await fetch('/api/webhook/clinic-portal/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user) {
            setUser({
              name: data.user.fullName,
              role: data.user.role,
              email: data.user.email
            });
            localStorage.setItem('user_data', JSON.stringify(data.user));
          } else {
            throw new Error('Invalid authentication response');
          }
        } else {
          throw new Error('Token verification failed');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('bearer_token');
        localStorage.removeItem('user_data');
        router.push('/login?expired=true');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleNavigation = useCallback((sectionId, href) => {
    setCurrentSection(sectionId);
    setSelectedPatientId(null); // Clear patient selection when navigating
  }, []);

  const handleNavigateToPatient = useCallback((patientId) => {
    setSelectedPatientId(patientId);
    setCurrentSection('patient-details');
  }, []);

  const handleNavigateToRegister = useCallback(() => {
    setCurrentSection('register');
  }, []);

  const handleRegisterAnother = useCallback(() => {
    // Stay on register page but reset form (handled by component)
    setCurrentSection('register');
  }, []);

  const handlePatientUpdated = useCallback((updatedPatient) => {
    // Could update local cache or refresh data if needed
    console.log('Patient updated:', updatedPatient);
  }, []);

  const handlePrintPatient = useCallback((patientId) => {
    // Navigate to patient details and trigger print
    setSelectedPatientId(patientId);
    setCurrentSection('patient-details');
    // Print will be handled by the PatientDetailsAndEdit component
  }, []);

  const getPageTitle = () => {
    switch (currentSection) {
      case 'dashboard':
        return 'Dashboard';
      case 'register':
        return 'Register Patient';
      case 'search':
        return 'Search Patients';
      case 'appointments':
        return 'Appointments';
      case 'audit':
        return 'Audit Logs';
      case 'patient-details':
        return 'Patient Details';
      case 'checkin':
        return 'Patient Check-In';
      case 'queue':
        return 'Queue Management';
      case 'analytics':
        return 'Check-In Analytics';
      case 'users':
        return 'User Management';
      default:
        return 'Dashboard';
    }
  };

  const renderCurrentSection = () => {
    // Check role-based access for admin-only sections
    if ((currentSection === 'audit' || currentSection === 'users') && user?.role !== 'admin') {
      return (
        <div className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🚫</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground">
              Administrator privileges required to access this section.
            </p>
          </div>
        </div>
      );
    }

    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="text-center space-y-6 p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to InvoTech Health Care</h2>
              <p className="text-gray-600">
                Your clinic management dashboard. Use the navigation menu to access different sections.
              </p>
            </div>
          </div>
        );
      
      case 'register':
        return (
          <div className="text-center space-y-6 p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Register Patient</h2>
              <p className="text-gray-600">Patient registration form will be available here.</p>
            </div>
          </div>
        );
      
      case 'search':
        return (
          <div className="text-center space-y-6 p-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🔍</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Patients</h2>
              <p className="text-gray-600">Patient search functionality will be available here.</p>
            </div>
          </div>
        );
      
      case 'appointments':
        return (
          <div className="text-center space-y-6 p-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Appointments</h2>
              <p className="text-gray-600">Appointment management will be available here.</p>
            </div>
          </div>
        );
      
      case 'audit':
        return (
          <AuditLogs />
        );
      
      case 'checkin':
        return (
          <PatientCheckin />
        );
      
      case 'queue':
        return (
          <QueueDashboard />
        );
      
      case 'analytics':
        return (
          <CheckInStats />
        );
      
      case 'users':
        return (
          <UserManagement />
        );
      
      case 'patient-details':
        return selectedPatientId ? (
          <PatientDetailsAndEdit
            patientId={selectedPatientId}
            onPatientUpdated={handlePatientUpdated}
          />
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No patient selected
          </div>
        );
      
      default:
        return (
          <div className="text-center space-y-6 p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to InvoTech Health Care</h2>
              <p className="text-gray-600">
                Your clinic management dashboard. Use the navigation menu to access different sections.
              </p>
            </div>
          </div>
        );
    }
  };

  // Show loading state while verifying authentication
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Verifying authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no user (will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <AppLayout
      pageTitle={getPageTitle()}
      onNavigate={handleNavigation}
      clinicStats={clinicStats}
      user={user}
    >
      {renderCurrentSection()}
    </AppLayout>
  );
}