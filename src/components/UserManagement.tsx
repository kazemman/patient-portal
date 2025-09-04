"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Key, Shield, User, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface StaffUser {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  users: StaffUser[];
  pagination: PaginationInfo;
  success: boolean;
}

interface CreateUserData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'staff';
}

interface EditUserData {
  fullName: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
}

interface ResetPasswordData {
  newPassword: string;
  confirmPassword: string;
}

export const UserManagement = () => {
  // State management
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Selected user for operations
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  
  // Form data states
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });
  
  const [editUserData, setEditUserData] = useState<EditUserData>({
    fullName: '',
    email: '',
    role: 'staff',
    isActive: true
  });
  
  const [resetPasswordData, setResetPasswordData] = useState<ResetPasswordData>({
    newPassword: '',
    confirmPassword: ''
  });

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('bearer_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter);
      }

      const response = await fetch(`/api/webhook/clinic-portal/admin/list-users?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data: ApiResponse = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  // Search debounce effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers(1);
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchUsers(1);
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, roleFilter, statusFilter]);

  // Form validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateFullName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 100;
  };

  // Create user handler
  const handleCreateUser = async () => {
    // Validation
    if (!validateFullName(createUserData.fullName)) {
      toast.error('Full name must be between 2 and 100 characters');
      return;
    }

    if (!validateEmail(createUserData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!validatePassword(createUserData.password)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    if (createUserData.password !== createUserData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/webhook/clinic-portal/admin/create-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: createUserData.fullName.trim(),
          email: createUserData.email.trim().toLowerCase(),
          password: createUserData.password,
          role: createUserData.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'EMAIL_ALREADY_EXISTS') {
          toast.error('This email address is already registered');
        } else {
          toast.error(errorData.error || 'Failed to create user');
        }
        return;
      }

      const data = await response.json();
      toast.success(`User ${data.user.fullName} created successfully`);
      setIsCreateModalOpen(false);
      setCreateUserData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff'
      });
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit user handler
  const handleEditUser = async () => {
    if (!selectedUser) return;

    // Validation
    if (!validateFullName(editUserData.fullName)) {
      toast.error('Full name must be between 2 and 100 characters');
      return;
    }

    if (!validateEmail(editUserData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/webhook/clinic-portal/admin/update-user', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: selectedUser.id,
          fullName: editUserData.fullName.trim(),
          email: editUserData.email.trim().toLowerCase(),
          role: editUserData.role,
          isActive: editUserData.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'EMAIL_ALREADY_EXISTS') {
          toast.error('This email address is already in use');
        } else if (errorData.code === 'CANNOT_DEACTIVATE_SELF') {
          toast.error('You cannot deactivate your own account');
        } else {
          toast.error(errorData.error || 'Failed to update user');
        }
        return;
      }

      const data = await response.json();
      toast.success(`User ${data.user.fullName} updated successfully`);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password handler
  const handleResetPassword = async () => {
    if (!selectedUser) return;

    // Validation
    if (!validatePassword(resetPasswordData.newPassword)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/webhook/clinic-portal/admin/reset-password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: resetPasswordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to reset password');
        return;
      }

      toast.success(`Password reset successfully for ${selectedUser.fullName}`);
      setIsResetPasswordModalOpen(false);
      setSelectedUser(null);
      setResetPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Deactivate user handler
  const handleDeactivateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/webhook/clinic-portal/admin/deactivate-user?userId=${selectedUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'CANNOT_DEACTIVATE_SELF') {
          toast.error('You cannot deactivate your own account');
        } else {
          toast.error(errorData.error || 'Failed to deactivate user');
        }
        return;
      }

      toast.success(`User ${selectedUser.fullName} deactivated successfully`);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers(pagination.page);
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user: StaffUser) => {
    setSelectedUser(user);
    setEditUserData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setIsEditModalOpen(true);
  };

  // Open reset password modal
  const openResetPasswordModal = (user: StaffUser) => {
    setSelectedUser(user);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setIsResetPasswordModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: StaffUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchUsers(newPage);
  };

  // Role color helper
  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  // Status indicator helper
  const getStatusIndicator = (isActive: boolean) => {
    return isActive ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-green-700">Active</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-500">Inactive</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage staff accounts and permissions</p>
          </div>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create New User
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-fullName">Full Name</Label>
                  <Input
                    id="create-fullName"
                    value={createUserData.fullName}
                    onChange={(e) => setCreateUserData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Role</Label>
                  <Select value={createUserData.role} onValueChange={(value: 'admin' | 'staff') => setCreateUserData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-password">Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    autoComplete="off"
                    value={createUserData.password}
                    onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-confirm-password">Confirm Password</Label>
                  <Input
                    id="create-confirm-password"
                    type="password"
                    autoComplete="off"
                    value={createUserData.confirmPassword}
                    onChange={(e) => setCreateUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, number, and special character.
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first user account'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-blue-600" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{user.fullName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  {getStatusIndicator(user.isActive)}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(user)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openResetPasswordModal(user)}
                      className="h-8 w-8 p-0"
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(user)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded">
              {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit User: {selectedUser?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={editUserData.fullName}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editUserData.role} onValueChange={(value: 'admin' | 'staff') => setEditUserData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Account Status</Label>
              <Select value={editUserData.isActive.toString()} onValueChange={(value) => setEditUserData(prev => ({ ...prev, isActive: value === 'true' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Reset Password: {selectedUser?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="off"
                value={resetPasswordData.newPassword}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                autoComplete="off"
                value={resetPasswordData.confirmPassword}
                onChange={(e) => setResetPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character.
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsResetPasswordModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{selectedUser?.fullName}</strong>? 
              This will prevent them from logging into the system. You can reactivate their account later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeactivateUser} 
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deactivating...' : 'Deactivate User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};