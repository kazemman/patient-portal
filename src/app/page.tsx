"use client";

import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import Dashboard from '@/components/Dashboard';
import PatientDetailsAndEdit from '@/components/PatientDetailsAndEdit';
import AuditLogs from '@/components/AuditLogs';
import { PatientCheckin } from '@/components/PatientCheckIn';
import { QueueDashboard } from '@/components/QueueDashboard';
import { CheckInStats } from '@/components/CheckInStats';
import { UserManagement } from '@/components/UserManagement';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import RegisterPatientForm from '@/components/RegisterPatientForm';
import SearchPatients from '@/components/SearchPatients';
import Appointments from '@/components/Appointments';

function MainContent() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [clinicStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    waitingPatients: 0,
    completedToday: 0
  });

  // Get user data from localStorage for immediate display
  const getUserData = () => {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return {
          name: parsedUser.fullName,
          role: parsedUser.role,
          email: parsedUser.email
        };
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }
    return null;
  };

  const user = getUserData();

  const handleNavigation = useCallback((sectionId, href) => {
    setCurrentSection(sectionId);
    setSelectedPatientId(null);
  }, []);

  const handleNavigateToPatient = useCallback((patientId) => {
    setSelectedPatientId(patientId);
    setCurrentSection('patient-details');
  }, []);

  const handleNavigateToRegister = useCallback(() => {
    setCurrentSection('register');
  }, []);

  const handleRegisterAnother = useCallback(() => {
    setCurrentSection('register');
  }, []);

  const handlePatientUpdated = useCallback((updatedPatient) => {
    console.log('Patient updated:', updatedPatient);
  }, []);

  const handlePrintPatient = useCallback((patientId) => {
    setSelectedPatientId(patientId);
    setCurrentSection('patient-details');
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
        return <Dashboard onNavigateToPatient={handleNavigateToPatient} />;
      
      case 'register':
        return (
          <RegisterPatientForm
            onNavigateToDetails={handleNavigateToPatient}
            onRegisterAnother={handleRegisterAnother}
          />
        );
      
      case 'search':
        return (
          <SearchPatients
            onNavigateToPatientDetails={handleNavigateToPatient}
            onNavigateToRegisterPatient={handleNavigateToRegister}
            onPrintPatient={handlePrintPatient}
          />
        );
      
      case 'appointments':
        return <Appointments />;
      
      case 'audit':
        return <AuditLogs />;
      
      case 'checkin':
        return <PatientCheckin />;
      
      case 'queue':
        return <QueueDashboard />;
      
      case 'analytics':
        return <CheckInStats />;
      
      case 'users':
        return <UserManagement />;
      
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
        return <Dashboard onNavigateToPatient={handleNavigateToPatient} />;
    }
  };

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

export default function HomePage() {
  return (
    <ProtectedRoute>
      <MainContent />
    </ProtectedRoute>
  );
}