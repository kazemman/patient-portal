'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Calendar, Clock, FileText, Pill, CreditCard, Activity, Phone } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

interface Patient {
  id: number;
  name: string;
  email: string;
}

interface Appointment {
  id: number;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  reason: string;
  notes?: string;
}

interface MedicalRecord {
  id: number;
  recordDate: string;
  title: string;
  description: string;
  recordType: string;
  doctorName: string;
}

interface Prescription {
  id: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  status: string;
  doctorName: string;
  startDate: string;
}

interface Bill {
  id: number;
  amount: number;
  description: string;
  status: string;
  billDate: string;
  dueDate: string;
}

interface DashboardData {
  patient: Patient;
  upcomingAppointments: Appointment[];
  recentMedicalRecords: MedicalRecord[];
  activePrescriptions: Prescription[];
  pendingBills: Bill[];
  statistics: {
    totalAppointments: number;
    activePrescriptionsCount: number;
    pendingBillsCount: number;
    totalPendingAmount: number;
  };
}

export default function PatientDashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // For demo purposes, we'll use patient ID 1
        // In a real app, you'd get this from the user's session or profile
        const patientId = 1;
        
        const token = localStorage.getItem("bearer_token");
        const response = await fetch(`/api/patients/${patientId}/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status}`);
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  if (isPending || loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Activity className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!dashboardData) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </AppLayout>
    );
  }

  const { patient, upcomingAppointments, recentMedicalRecords, activePrescriptions, pendingBills, statistics } = dashboardData;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {patient.name}!</h1>
          <p className="text-blue-100">Here's an overview of your health information.</p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.activePrescriptionsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.pendingBillsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Amount Due</p>
                <p className="text-2xl font-bold text-gray-900">${statistics.totalPendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Appointment */}
        {upcomingAppointments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Next Appointment</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{upcomingAppointments[0].reason}</h3>
                    <p className="text-sm text-gray-600">with {upcomingAppointments[0].doctorName}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(upcomingAppointments[0].appointmentDate).toLocaleDateString()}</span>
                      <Clock className="h-4 w-4 ml-4 mr-1" />
                      <span>{upcomingAppointments[0].appointmentTime}</span>
                    </div>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Calendar className="h-6 w-6 text-blue-600 mr-3" />
                <span className="font-medium">Book Appointment</span>
              </button>
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <FileText className="h-6 w-6 text-green-600 mr-3" />
                <span className="font-medium">View Records</span>
              </button>
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Pill className="h-6 w-6 text-purple-600 mr-3" />
                <span className="font-medium">Prescriptions</span>
              </button>
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <CreditCard className="h-6 w-6 text-orange-600 mr-3" />
                <span className="font-medium">Bills & Payments</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Medical Records */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Medical Records</h2>
            </div>
            <div className="p-6">
              {recentMedicalRecords.length > 0 ? (
                <div className="space-y-4">
                  {recentMedicalRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{record.title}</p>
                        <p className="text-sm text-gray-600">by {record.doctorName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(record.recordDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full mt-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">
                    View All Records
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No medical records available</p>
              )}
            </div>
          </div>

          {/* Active Prescriptions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Prescriptions</h2>
            </div>
            <div className="p-6">
              {activePrescriptions.length > 0 ? (
                <div className="space-y-4">
                  {activePrescriptions.slice(0, 5).map((prescription) => (
                    <div key={prescription.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Pill className="h-5 w-5 text-green-600 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{prescription.medicationName}</p>
                        <p className="text-sm text-gray-600">{prescription.dosage} - {prescription.frequency}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Prescribed by {prescription.doctorName}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full mt-4 py-2 text-sm text-green-600 border border-green-200 rounded-md hover:bg-green-50">
                    View All Prescriptions
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active prescriptions</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Bills */}
        {pendingBills.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Bills</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {pendingBills.slice(0, 3).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{bill.description}</p>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(bill.dueDate).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        bill.status === 'overdue' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${bill.amount.toFixed(2)}</p>
                      <button className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Pay Now
                      </button>
                    </div>
                  </div>
                ))}
                {pendingBills.length > 3 && (
                  <button className="w-full mt-4 py-2 text-sm text-orange-600 border border-orange-200 rounded-md hover:bg-orange-50">
                    View All Bills ({pendingBills.length - 3} more)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}