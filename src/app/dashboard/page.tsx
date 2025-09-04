"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, FileText, Pill, CreditCard, User, CalendarDays, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PatientData {
  nextAppointment: {
    date: string;
    time: string;
    doctor: string;
    type: string;
  } | null;
  recentRecords: number;
  activePrescriptions: number;
  upcomingAppointments: number;
}

export default function PatientDashboard() {
  const [patientData, setPatientData] = useState<PatientData>({
    nextAppointment: {
      date: "2024-02-15",
      time: "2:30 PM", 
      doctor: "Dr. Sarah Johnson",
      type: "Regular Checkup"
    },
    recentRecords: 3,
    activePrescriptions: 2,
    upcomingAppointments: 1
  });
  const [isLoading, setIsLoading] = useState(false);

  const quickActions = [
    {
      title: "Book Appointment",
      description: "Schedule a new appointment with your healthcare provider",
      icon: Calendar,
      href: "/appointments/book",
      color: "bg-blue-500"
    },
    {
      title: "View Medical Records",
      description: "Access your complete medical history and test results",
      icon: FileText,
      href: "/records", 
      color: "bg-green-500"
    },
    {
      title: "Prescriptions",
      description: "View active prescriptions and request refills",
      icon: Pill,
      href: "/prescriptions",
      color: "bg-purple-500"
    },
    {
      title: "Bills & Payments",
      description: "View outstanding bills and payment history",
      icon: CreditCard,
      href: "/billing",
      color: "bg-orange-500"
    }
  ];

  const statsCards = [
    {
      title: "Upcoming Appointments",
      value: patientData.upcomingAppointments,
      icon: CalendarDays,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Recent Records",
      value: patientData.recentRecords,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Active Prescriptions", 
      value: patientData.activePrescriptions,
      icon: Pill,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8 p-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Your Patient Portal
          </h1>
          <p className="text-muted-foreground">
            Access your medical information, appointments, and healthcare services all in one place.
          </p>
        </div>

        {/* Next Appointment Card */}
        {patientData.nextAppointment && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-900">Next Appointment</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Upcoming
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-blue-900">
                  {patientData.nextAppointment.type}
                </p>
                <p className="text-blue-700">
                  <strong>Date:</strong> {new Date(patientData.nextAppointment.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-blue-700">
                  <strong>Time:</strong> {patientData.nextAppointment.time}
                </p>
                <p className="text-blue-700">
                  <strong>Provider:</strong> {patientData.nextAppointment.doctor}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" className="border-blue-600 text-blue-600">
                    Reschedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {action.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest healthcare interactions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Lab results available</p>
                  <p className="text-sm text-muted-foreground">Blood work from January 28, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <Pill className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Prescription refill ready</p>
                  <p className="text-sm text-muted-foreground">Available for pickup at your pharmacy</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Appointment reminder</p>
                  <p className="text-sm text-muted-foreground">Regular checkup scheduled for February 15</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}