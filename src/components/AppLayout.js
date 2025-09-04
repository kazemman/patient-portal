"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Search, 
  Calendar, 
  LogIn, 
  Users, 
  BarChart3, 
  FileText, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvotechLogo } from '@/components/InvotechLogo';

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  pageTitle,
  onNavigate,
  clinicStats,
  user
}) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    if (typeof window !== "undefined") {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

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
            setUser(parsedUser);
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
            setUser(data.user);
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

  // Define navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: LayoutDashboard,
        href: '/dashboard',
        roles: ['admin', 'staff']
      },
      { 
        id: 'register', 
        label: 'Register Patient', 
        icon: Component,
        href: '/register',
        roles: ['admin', 'staff']
      },
      { 
        id: 'search', 
        label: 'Search Patients', 
        icon: PanelsLeftBottom,
        href: '/search',
        roles: ['admin', 'staff']
      },
      { 
        id: 'checkin', 
        label: 'Patient Check-In', 
        icon: UserPlus,
        href: '/checkin',
        roles: ['admin', 'staff']
      },
      { 
        id: 'queue', 
        label: 'Queue Management', 
        icon: Users,
        href: '/queue',
        roles: ['admin', 'staff']
      },
      { 
        id: 'appointments', 
        label: 'Appointments', 
        icon: LayoutTemplate,
        href: '/appointments',
        roles: ['admin', 'staff']
      },
      { 
        id: 'checkin-stats', 
        label: 'Check-In Analytics', 
        icon: BarChart3,
        href: '/checkin-stats',
        roles: ['admin', 'staff']
      }
    ];

    const adminItems = [
      { 
        id: 'audit', 
        label: 'Audit Logs', 
        icon: PanelLeftDashed,
        href: '/audit',
        roles: ['admin']
      },
      { 
        id: 'users', 
        label: 'User Management', 
        icon: UserCog,
        href: '/users',
        roles: ['admin']
      }
    ];

    // Filter items based on user role
    const allItems = [...baseItems, ...adminItems];
    return allItems.filter(item => 
      user ? item.roles.includes(user.role) : false
    );
  };

  const navItems = getNavItems();
  const filteredNavigationItems = navItems.filter(item => !item.adminOnly);

  const handleNavigation = useCallback((item) => {
    if (onNavigate) {
      onNavigate(item.id, item.href);
    }
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [onNavigate, isMobile]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('bearer_token');
      
      // Call logout endpoint
      if (token) {
        try {
          await fetch('/api/webhook/clinic-portal/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }

      // Clear local storage
      localStorage.removeItem('bearer_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('intended_destination');

      // Show success message
      toast.success('Logged out successfully');

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed, but local session cleared');
      router.push('/login');
    }
  };

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  }, [isMobile, mobileMenuOpen, sidebarCollapsed]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (!isMobile && sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [isMobile, sidebarCollapsed]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Show loading state while verifying authentication
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen bg-white border-r border-blue-100 shadow-lg
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and Header */}
          <div className="flex items-center justify-between p-4 border-b border-blue-100">
            {!sidebarCollapsed && (
              <InvotechLogo size="medium" showText={true} />
            )}
            {sidebarCollapsed && (
              <InvotechLogo size="small" showText={false} className="mx-auto" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-blue-600 hover:bg-blue-50"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-blue-600 hover:bg-blue-50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {filteredNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg
                    text-left transition-all duration-200
                    hover:bg-blue-50 hover:text-blue-700
                    text-slate-600 hover:shadow-sm
                    ${sidebarCollapsed ? 'justify-center' : ''}
                  `}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.adminOnly && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-700">
                      Admin
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info and Logout */}
          <div className="p-4 border-t border-blue-100">
            {user && !sidebarCollapsed && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900 text-sm">{user.name}</p>
                <p className="text-xs text-blue-600 capitalize">{user.role}</p>
                {user.email && (
                  <p className="text-xs text-blue-500 mt-1">{user.email}</p>
                )}
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className={`
                w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300
                ${sidebarCollapsed ? 'px-2' : ''}
              `}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-blue-100 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-heading font-bold text-blue-900">{pageTitle}</h2>
                <p className="text-sm text-blue-600">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} • {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>

            {user && (
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-semibold text-blue-900 text-sm">{user.name}</p>
                  <p className="text-xs text-blue-600 capitalize">{user.role}</p>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          {clinicStats && (
            <div className="px-4 lg:px-6 pb-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard 
                  title="Total Patients" 
                  value={clinicStats.totalPatients} 
                  icon={Users} 
                />
                <StatCard 
                  title="Today's Appointments" 
                  value={clinicStats.todayAppointments} 
                  icon={Calendar} 
                />
                <StatCard 
                  title="Waiting" 
                  value={clinicStats.waitingPatients} 
                  icon={Activity} 
                />
                <StatCard 
                  title="Completed Today" 
                  value={clinicStats.completedToday} 
                  icon={BarChart3} 
                />
              </div>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <div className="h-full p-4 lg:p-6">
            <div className="h-full bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="h-full overflow-auto p-6">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};