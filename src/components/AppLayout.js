"use client";

import { useState, useCallback, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PanelLeft, 
  ChevronLeft, 
  Component, 
  LayoutTemplate,
  PanelLeftDashed,
  PanelsLeftBottom,
  LayoutPanelTop,
  UserPlus,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { InvotechLogo } from '@/components/InvotechLogo';

export default function AppLayout({ 
  children, 
  pageTitle = "Dashboard",
  onNavigate,
  clinicStats = { todayPatients: 0, newRegistrations: 0 }
}) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="flex h-screen bg-background font-sans">
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:relative z-50 h-full bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${isMobile 
            ? `${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
            : `${sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'}`
          }
        `}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center p-4 border-b border-sidebar-border">
            <div className="flex items-center min-w-0 w-full">
              {(isMobile || !sidebarCollapsed) ? (
                <InvotechLogo 
                  size="medium" 
                  showText={true}
                  className="w-full"
                />
              ) : (
                <InvotechLogo 
                  size="small" 
                  showText={false}
                  className="mx-auto"
                />
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-2 space-y-1" role="navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={`
                    w-full flex items-center p-3 rounded-lg
                    text-sidebar-foreground hover:bg-sidebar-accent
                    hover:text-sidebar-accent-foreground
                    transition-all duration-200 group
                    ${(isMobile || !sidebarCollapsed) ? 'justify-start' : 'justify-center'}
                  `}
                  title={sidebarCollapsed && !isMobile ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`
                    ml-3 text-sm font-medium transition-opacity duration-300
                    ${(isMobile || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
                  `}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-2 border-t border-sidebar-border">
            <div className={`
              flex items-center p-3 rounded-lg bg-sidebar-accent/50
              ${(isMobile || !sidebarCollapsed) ? 'justify-start' : 'justify-center'}
            `}>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                {user.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <span className="text-xs font-medium text-primary-foreground">
                    {user.fullName.charAt(0)}
                  </span>
                )}
              </div>
              <div className={`
                ml-3 min-w-0 transition-opacity duration-300
                ${(isMobile || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
              `}>
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
                </p>
              </div>
            </div>
            
            {/* Logout Button */}
            <div className={`
              mt-2 transition-opacity duration-300
              ${(isMobile || !sidebarCollapsed) ? 'opacity-100' : 'opacity-0'}
            `}>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="text-sm">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header 
          className="bg-card border-b border-border p-4"
          role="banner"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobile ? (
                  <LayoutPanelTop className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
              </button>
              <h1 className="text-xl font-heading font-bold text-foreground">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search Shortcut */}
              <button 
                className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                onClick={() => handleNavigation({ id: 'search', href: '/search' })}
              >
                <PanelsLeftBottom className="w-4 h-4" />
                <span>Search</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs">⌘K</kbd>
              </button>

              {/* User Info & Role Badge */}
              <div className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-muted rounded-lg">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === 'admin' ? 'Administrator' : 'Staff Member'}
                  </p>
                </div>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${user.role === 'admin' ? 'bg-blue-100' : 'bg-green-100'}
                `}>
                  {user.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-blue-600" />
                  ) : (
                    <span className="text-xs font-medium text-green-600">
                      {user.fullName.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Clinic Stats */}
              <div className="hidden lg:flex items-center space-x-4 px-4 py-2 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {clinicStats.todayPatients}
                  </p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-1">
                    {clinicStats.newRegistrations}
                  </p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          className="flex-1 overflow-auto bg-background"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}