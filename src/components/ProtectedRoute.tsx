"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'staff';
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff';
  requiredPermissions?: string[];
  fallbackComponent?: React.ComponentType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermissions = [],
  fallbackComponent: FallbackComponent,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkAuthentication = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get token from localStorage
      const token = localStorage.getItem('bearer_token');
      
      if (!token) {
        // Store intended destination for post-login redirect
        const currentPath = window.location.pathname + window.location.search;
        localStorage.setItem('intended_destination', currentPath);
        router.push('/login?redirect=true');
        return;
      }

      // Verify token with server
      const response = await fetch('/api/webhook/clinic-portal/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (response.status === 401) {
          // Token is invalid or expired
          localStorage.removeItem('bearer_token');
          localStorage.removeItem('user_data');
          
          const currentPath = window.location.pathname + window.location.search;
          localStorage.setItem('intended_destination', currentPath);
          
          if (errorData.code === 'TOKEN_EXPIRED') {
            router.push('/login?expired=true');
          } else {
            router.push('/login?invalid=true');
          }
          return;
        }
        
        throw new Error(errorData.error || 'Authentication verification failed');
      }

      const data = await response.json();
      
      if (!data.valid || !data.user) {
        throw new Error('Invalid authentication response');
      }

      setUser(data.user);

      // Check role-based access
      if (requiredRole && data.user.role !== requiredRole && !(requiredRole === 'staff' && data.user.role === 'admin')) {
        setError(`Access denied. ${requiredRole} role required.`);
        return;
      }

      // Note: Permission-based access could be implemented here
      // For now, we'll focus on role-based access as per the current API structure
      if (requiredPermissions.length > 0) {
        // Placeholder for future permission system
        console.log('Permission check requested but not implemented:', requiredPermissions);
      }

    } catch (err) {
      console.error('Authentication check failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      
      // For network errors or server issues, don't redirect immediately
      // Give user option to retry or go to login
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center space-y-6">
              {/* Clinic branding */}
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary animate-pulse"></div>
              </div>
              
              <div className="text-center space-y-3">
                <h2 className="text-xl font-heading font-semibold text-foreground">
                  Verifying Access
                </h2>
                <p className="text-sm text-muted-foreground">
                  Checking your authentication...
                </p>
              </div>

              <div className="flex items-center space-x-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Authenticating</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (authentication failed, insufficient permissions, etc.)
  if (error || !user) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-heading font-semibold text-foreground">
              Access Denied
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error || 'You do not have permission to access this area'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {requiredRole ? (
                  <>Required role: <span className="font-medium text-foreground">{requiredRole}</span></>
                ) : (
                  'Authentication required'
                )}
              </p>
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current role: <span className="font-medium">{user.role}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Login
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              
              {error && error.includes('server') && (
                <Button
                  onClick={checkAuthentication}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Successfully authenticated and authorized
  return <>{children}</>;
};