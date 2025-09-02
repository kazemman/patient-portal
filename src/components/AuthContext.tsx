"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'staff';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<boolean>;
  
  // Permission helpers
  isAdmin: () => boolean;
  isStaff: () => boolean;
  canAccess: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

const API_BASE_URL = '/webhook/clinic-portal';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }, []);

  // Get stored token
  const getStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }, []);

  // Store auth data
  const storeAuthData = useCallback((token: string, userData: User) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_info', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // Verify token with server
  const verifyToken = useCallback(async (): Promise<boolean> => {
    const token = getStoredToken();
    if (!token) {
      clearAuthData();
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          setUser(data.user);
          localStorage.setItem('user_info', JSON.stringify(data.user));
          setIsLoading(false);
          return true;
        }
      }
      
      // Token is invalid or expired
      clearAuthData();
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      clearAuthData();
      setIsLoading(false);
      return false;
    }
  }, [getStoredToken, clearAuthData]);

  // Login function
  const login = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        storeAuthData(data.token, data.user);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { 
          success: false, 
          error: data.error || 'Login failed. Please check your credentials and try again.' 
        };
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }, [storeAuthData]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    const token = getStoredToken();
    
    // Always clear local data first
    clearAuthData();

    // Attempt to notify server (optional - don't block logout on failure)
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Server logout notification failed:', error);
        // Continue with logout even if server notification fails
      }
    }

    // Redirect to login page
    router.push('/login');
  }, [getStoredToken, clearAuthData, router]);

  // Permission helpers
  const isAdmin = useCallback((): boolean => {
    return user?.role === 'admin';
  }, [user]);

  const isStaff = useCallback((): boolean => {
    return user?.role === 'staff';
  }, [user]);

  const canAccess = useCallback((feature: string): boolean => {
    if (!user) return false;

    // Define feature permissions
    const adminFeatures = [
      'user-management',
      'admin-settings',
      'system-reports',
      'audit-logs-full',
      'staff-management'
    ];

    const staffFeatures = [
      'dashboard',
      'patient-registration',
      'patient-search',
      'appointments',
      'check-in',
      'basic-reports'
    ];

    // Admin has access to all features
    if (user.role === 'admin') {
      return true;
    }

    // Staff only has access to staff features
    if (user.role === 'staff') {
      return staffFeatures.includes(feature) || !adminFeatures.includes(feature);
    }

    return false;
  }, [user]);

  // Auto-verify token on mount and restore user from localStorage
  useEffect(() => {
    const initAuth = async () => {
      // Try to restore user from localStorage first for immediate UI update
      const storedUserInfo = localStorage.getItem('user_info');
      if (storedUserInfo) {
        try {
          const userData = JSON.parse(storedUserInfo);
          setUser(userData);
        } catch (error) {
          console.error('Failed to parse stored user info:', error);
          localStorage.removeItem('user_info');
        }
      }

      // Then verify with server
      await verifyToken();
    };

    initAuth();
  }, [verifyToken]);

  // Handle token expiration - periodic verification
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const isValid = await verifyToken();
      if (!isValid) {
        router.push('/login?expired=true');
      }
    }, 15 * 60 * 1000); // Check every 15 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, verifyToken, router]);

  const contextValue: AuthContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    logout,
    verifyToken,
    
    // Permission helpers
    isAdmin,
    isStaff,
    canAccess,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: Role
) => {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, user, canAccess } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login');
          return;
        }

        if (requiredRole && user?.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }
      }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to login
    }

    if (requiredRole && user?.role !== requiredRole) {
      return null; // Will redirect to unauthorized
    }

    return <Component {...props} />;
  };
};

// Role-based access control hook
export const usePermissions = () => {
  const { user, isAdmin, isStaff, canAccess } = useAuth();

  return {
    user,
    isAdmin: isAdmin(),
    isStaff: isStaff(),
    canAccess,
    hasRole: (role: Role) => user?.role === role,
    hasAnyRole: (roles: Role[]) => user ? roles.includes(user.role) : false,
  };
};

export default AuthProvider;