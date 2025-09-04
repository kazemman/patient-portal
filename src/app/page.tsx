'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Calendar, FileText, Users, Shield, BarChart3, UserCheck } from 'lucide-react'
import { authClient, useSession } from '@/lib/auth-client'

export default function Home() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  // If user is authenticated, redirect to dashboard
  useEffect(() => {
    if (!isPending && session?.user) {
      router.push('/dashboard')
    }
  }, [session, isPending, router])

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, don't show this page (will redirect)
  if (session?.user) {
    return null
  }

  const features = [
    {
      title: "Patient Management",
      description: "Comprehensive patient registration, records management, and tracking",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Appointment Scheduling",
      description: "Efficient appointment booking, scheduling, and calendar management",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Queue Management",
      description: "Real-time patient queue tracking and workflow optimization",
      icon: UserCheck,
      color: "text-purple-600"
    },
    {
      title: "Analytics & Reports",
      description: "Detailed insights and reporting on clinic operations and performance",
      icon: BarChart3,
      color: "text-orange-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1756993698483-m835t4w714e.png" 
              alt="InvoTech Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">InvoTech Health Care</h1>
              <p className="text-sm text-gray-600">Staff Portal</p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Staff Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Healthcare Management, <span className="text-blue-600">Simplified</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Streamline your clinic operations with our comprehensive staff portal. 
            Manage patients, schedule appointments, and optimize your healthcare workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Access Staff Portal
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need for Efficient Healthcare Management
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our staff portal provides comprehensive tools to manage your clinic operations effectively.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Streamline Your Healthcare Operations?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join healthcare professionals who are already using our comprehensive 
            staff portal to manage their clinic operations more efficiently.
          </p>
          <Button 
            size="lg"
            onClick={() => router.push('/login')}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1756993698483-m835t4w714e.png" 
                alt="InvoTech Logo" 
                className="w-8 h-8 object-contain"
              />
              <div>
                <p className="font-semibold">InvoTech Health Care</p>
                <p className="text-sm text-gray-400">Your trusted healthcare management partner</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-400">© 2024 InvoTech Health Care. All rights reserved.</p>
              <p className="text-sm text-gray-400">Secure • Efficient • Reliable</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}