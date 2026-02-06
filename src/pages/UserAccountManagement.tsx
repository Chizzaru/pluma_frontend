/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Dialog from '@radix-ui/react-dialog';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

import toast from 'react-hot-toast';

import { Check, Pencil, Trash2, X, Search, ChevronLeft, ChevronRight, User, Mail, Key, Shield, Users2, Eye, EyeOff} from 'lucide-react';

import api from '@/api/axiosInstance';
import type { Role } from '@/types/auth';
import { useAuth } from '@/auth/useAuth';

interface UserAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  role: [
    {
      id: number,
      name: string;
    }
  ];
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}

// Helper function to properly encode/decode special characters
const fixSpecialCharacters = (str: string): string => {
  if (!str) return str;
  
  try {
    // First try to decode any encoded characters
    return decodeURIComponent(str);
  } catch {
    // If decoding fails, return the original string
    return str;
  }
};

const UserAccountManagement: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Password visibility state
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  
  // Pagination and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Employee searchable dropdown state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isUser, setIsUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available items per page options
  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
  });

  // Load employees from API with debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (employeeSearch.trim() && !selectedEmployee) {
        fetchEmployees(employeeSearch);
      } else if (!employeeSearch.trim()) {
        setEmployees([]);
        setShowEmployeeDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [employeeSearch, selectedEmployee]);

  const fetchEmployees = async (search: string) => {
    setIsLoadingEmployees(true);
    try {
      // Create URLSearchParams to properly encode the search parameter
      const params = new URLSearchParams();
      params.append('search', search);
      
      const response = await api.get(`v1/employees/?${params.toString()}`);
      
      // Process the response data to fix encoding issues
      const processedData = response.data.map((emp: Employee) => ({
        ...emp,
        firstName: fixSpecialCharacters(emp.firstName || ''),
        lastName: fixSpecialCharacters(emp.lastName || ''),
        email: fixSpecialCharacters(emp.email || '')
      }));
      
      setEmployees(processedData);
      setShowEmployeeDropdown(true);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      
      // Try alternative approach if first fails
      try {
        const altResponse = await api.get("/api/v1/employees/", {
          params: { search },
          paramsSerializer: (params) => {
            return Object.keys(params)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
              .join('&');
          }
        });
        
        const processedData = altResponse.data.map((emp: Employee) => ({
          ...emp,
          firstName: fixSpecialCharacters(emp.firstName || ''),
          lastName: fixSpecialCharacters(emp.lastName || ''),
          email: fixSpecialCharacters(emp.email || '')
        }));
        
        setEmployees(processedData);
        setShowEmployeeDropdown(true);
      } catch (altError) {
        console.error('Alternative fetch also failed:', altError);
        toast.error('Failed to search employees');
        setEmployees([]);
        setShowEmployeeDropdown(false);
      }
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    
    // Extract username from email (everything before @)
    const emailParts = employee.email.split('@');
    const usernameFromEmail = emailParts[0] || employee.email;
    setUsername(usernameFromEmail);
    
    setEmail(employee.email);
    setShowEmployeeDropdown(false);
  };

  const clearEmployeeSelection = () => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setUsername('');
    setEmail('');
  };

  // Load users from API
  const loadUsers = async (page: number = pagination.currentPage, limit: number = pagination.itemsPerPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        userId: user?.id || '',
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`v1/users?${params.toString()}`);
      
      // Process the user data to fix encoding issues
      const processedUsers = response.data.data.map((user: UserAccount) => ({
        ...user,
        username: fixSpecialCharacters(user.username || ''),
        email: fixSpecialCharacters(user.email || '')
      }));
      
      setUsers(processedUsers);

      setPagination(prev => ({
        ...prev,
        currentPage: response.data.total.currentPage,
        totalPages: response.data.total.totalPages,
        totalItems: response.data.total.totalItems,
        itemsPerPage: response.data.total.itemsPerPage,
      }));
      
      // Clear selections when data changes
      setSelectedUsers(new Set());
    } catch (error) {
      toast.error("Error fetching users");
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load users when component mounts or when pagination/search changes
  useEffect(() => {
    loadUsers(1, pagination.itemsPerPage); // Reset to page 1 when items per page changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.itemsPerPage]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(1, pagination.itemsPerPage); // Reset to page 1 when search changes
    }, 300);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadUsers(newPage, pagination.itemsPerPage);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
    }));
  };

  // Calculate range of displayed items
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /*const getDisplayRange = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endIndex = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
    return { startIndex, endIndex };
  };*/

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password ) return;

    setIsSubmitting(true);

    try {
      const roles: Array<Role> = []
      if (isUser) roles.push("ROLE_USER")
      if (isAdmin) roles.push("ROLE_ADMIN")
      
      // Create FormData for better encoding handling
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('roles', JSON.stringify(roles));
      
      const response = await api.post("auth/register", formData, {
        headers: {
          'Content-Type': 'multipart/form-data; charset=utf-8',
        }
      });

      if (response.status === 200 ) {
        // Reload the current page to show the new user
        await loadUsers(pagination.currentPage, pagination.itemsPerPage);
        setCreateDialogOpen(false)
        resetForm()
        toast.success("Successfully created new User")
      } else {
        toast.error("Failed to create new User")
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create user account')
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const roles: Array<Role> = []
      if (isUser) roles.push("ROLE_USER")
      if (isAdmin) roles.push("ROLE_ADMIN")

      // Create FormData for better encoding handling
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      if (password) {
        formData.append('password', password);
      }
      formData.append('roles', JSON.stringify(roles));

      const response = await api.put(`v1/users/${selectedUser.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data; charset=utf-8',
        }
      });

      if (response.status === 200) {
        // Reload the current page to reflect changes
        await loadUsers(pagination.currentPage, pagination.itemsPerPage);
        setEditDialogOpen(false);
        resetForm();
        toast.success("Successfully updated user");
      } else {
        toast.error("Failed to update user");
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId?: string) => {
    const userIdToDelete = userId || selectedUser?.id;
    if (!userIdToDelete) return;

    try {
      await api.delete(`v1/users/${userIdToDelete}`);
      
      // Reload data - if we're on the last page and it becomes empty, go to previous page
      let pageToLoad = pagination.currentPage;
      if (users.length === 1 && pagination.currentPage > 1) {
        pageToLoad = pagination.currentPage - 1;
      }
      
      await loadUsers(pageToLoad, pagination.itemsPerPage);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success("User deleted successfully");
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete user account');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.size === 0) return;

    try {
      // Delete all selected users
      await Promise.all(
        Array.from(selectedUsers).map(userId => 
          api.delete(`v1/users/${userId}`)
        )
      );
      
      // Reload data
      await loadUsers(pagination.currentPage, pagination.itemsPerPage);
      toast.success(`${selectedUsers.size} users deleted successfully`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete selected users');
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setIsUser(false)
    setIsAdmin(false)
    setSelectedUser(null);
    setSelectedEmployee(null);
    setEmployeeSearch('');
  };

  const openEditDialog = (user: UserAccount) => {
    setSelectedUser(user);
    setUsername(user.username);
    setEmail(user.email);
    setPassword('');
    
    // Set role checkboxes based on user's roles (handle both string roles and object roles)
    const userRoles = user.roles.map(role => typeof role === 'string' ? role : (role as any).name);
    setIsUser(userRoles.includes('ROLE_USER'));
    setIsAdmin(userRoles.includes('ROLE_ADMIN'));
    
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserAccount) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      const allIds = new Set(users.map(user => user.id));
      setSelectedUsers(allIds);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(userId)) {
      newVisible.delete(userId);
    } else {
      newVisible.add(userId);
    }
    setVisiblePasswords(newVisible);
  };

  const getRoleBadgeColor = (roleName: string) => {
    return roleName === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  // Format date like ApiPage
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // Normalize to start of day (local time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays =
      Math.round(
        (startOfToday.getTime() - startOfDate.getTime()) /
        (1000 * 60 * 60 * 24)
      );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    if (diffDays < 0) return 'In the future';

    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }

    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString();
  };

  //const { startIndex, endIndex } = getDisplayRange();

  return (
    <div className="relative min-h-screen bg-[#E7F2EF] p-8">
      {/* Background image with blur */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          }}>
      </div>
      {/* Optional dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30"></div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#A1C2BD] rounded-lg">
                  <Users2 className="w-6 h-6 text-[#19183B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#19183B]">User Accounts</h1>
              </div>
              <p className="text-[#708993] ml-14">View and manage user accounts</p>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedUsers.size > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#A1C2BD]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {selectedUsers.size} selected
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Deselect all
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by username or email ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#708993] whitespace-nowrap">Show:</span>
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  {itemsPerPageOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <span className="text-sm text-[#708993] whitespace-nowrap">per page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-[#19183B] rounded-full animate-spin mb-4"></div>
                <p className="text-lg">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                <User className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">No users found</p>
                <p className="text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No user accounts found'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-12 px-6 py-3 text-left">
                        <CheckboxPrimitive.Root
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        >
                          <CheckboxPrimitive.Indicator>
                            <Check className="w-3 h-3 text-white" />
                          </CheckboxPrimitive.Indicator>
                        </CheckboxPrimitive.Root>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 transition-colors ${selectedUsers.has(user.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <CheckboxPrimitive.Root
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                          >
                            <CheckboxPrimitive.Indicator>
                              <Check className="w-3 h-3 text-white" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[#E7F2EF] flex items-center justify-center">
                              <User className="w-4 h-4 text-[#19183B]" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.role.map(r => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(r.name)}`}
                              >
                                <Shield className="w-3 h-3" />
                                {r.name.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 font-mono">
                              {visiblePasswords.has(user.id)
                                ? user.password || '••••••••'
                                : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="p-1 text-gray-400 hover:text-[#19183B] transition-colors shrink-0"
                              title={visiblePasswords.has(user.id) ? 'Hide password' : 'Show password'}
                            >
                              {visiblePasswords.has(user.id)
                                ? <EyeOff className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{formatRelativeDate(user.createdAt)}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.updatedAt ? (
                            <>
                              <div className="text-sm text-gray-700">{formatRelativeDate(user.updatedAt)}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(user.updatedAt).toLocaleDateString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/*<button
                              onClick={() => openEditDialog(user)}
                              className="p-2 text-gray-500 hover:text-[#19183B] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>*/}
                            <button
                              onClick={() => openEditDialog(user)}
                              className="p-2 text-gray-500 hover:text-[#19183B] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Send Email to user"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(user)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination - Updated to match ApiPage style */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-[#A1C2BD] p-6 bg-[#E7F2EF]/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#708993]">
                  Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalItems} items
                </p>
                <div className="flex items-center gap-2">
                  {/* Previous */}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.totalPages;
                      const maxVisible = 5;
                      
                      let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
                      const endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      
                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }
                      
                      return pages.map(page => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            pagination.currentPage === page
                              ? 'bg-[#19183B] text-white'
                              : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#A1C2BD] rounded-lg">
                <User className="w-6 h-6 text-[#19183B]" />
              </div>
              Create User Account
            </Dialog.Title>

            <Form.Root onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Employee Search Field */}
              <Form.Field name="employee">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Select Employee
                  </Form.Label>
                </div>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search for employee by name or email..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      onFocus={() => {
                        if (employeeSearch.trim() && employees.length > 0 && !selectedEmployee) {
                          setShowEmployeeDropdown(true);
                        }
                      }}
                      className="w-full pl-10 pr-10 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                    />
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={clearEmployeeSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#708993] hover:text-red-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Employee Dropdown */}
                  {showEmployeeDropdown && !selectedEmployee && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#A1C2BD] rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {isLoadingEmployees ? (
                        <div className="p-4 text-center">
                          <div className="inline-block w-6 h-6 border-2 border-[#A1C2BD] border-t-[#19183B] rounded-full animate-spin"></div>
                          <p className="mt-2 text-sm text-[#708993]">Searching employees...</p>
                        </div>
                      ) : employees.length === 0 ? (
                        <div className="p-4 text-center text-[#708993]">
                          {employeeSearch.trim() ? 'No employees found' : 'Start typing to search employees'}
                        </div>
                      ) : (
                        <div className="py-1">
                          {employees.map((employee) => (
                            <button
                              key={employee.id}
                              type="button"
                              onClick={() => handleEmployeeSelect(employee)}
                              className="w-full px-4 py-3 text-left hover:bg-[#E7F2EF] transition-colors border-b border-[#A1C2BD]/30 last:border-b-0"
                            >
                              <div className="font-medium text-[#19183B]">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-[#708993]">{employee.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Form.Field>

              <Form.Field name="username">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Username
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please enter a username
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="email">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please enter an email
                  </Form.Message>
                  <Form.Message match="typeMismatch" className="text-xs text-red-600">
                    Please enter a valid email
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="password">
                <div className="flex items-baseline justify-between mb-2">
                  <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Password
                  </Form.Label>
                  <Form.Message match="valueMissing" className="text-xs text-red-600">
                    Please enter a password
                  </Form.Message>
                </div>
                <Form.Control asChild>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name='role'>
                <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role
                </Form.Label>

                {/* Hidden input for validation */}
                <Form.Control asChild>
                  <input
                    type="text"
                    value={isUser || isAdmin ? 'valid' : ''}
                    onChange={() => {}}
                    required
                    style={{ display: 'none' }}
                  />
                </Form.Control>
                
                <Form.Control asChild>
                  <div className='flex gap-4'>
                    <div className="flex items-center">
                      <CheckboxPrimitive.Root 
                        id="isUser"
                        checked={isUser} 
                        onCheckedChange={(checked) => setIsUser(checked === true)} 
                        className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      >
                        <CheckboxPrimitive.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <Form.Label className='ml-2' htmlFor='isUser'>User</Form.Label>
                    </div>
                    <div className="flex items-center">
                      <CheckboxPrimitive.Root 
                        id="isAdmin"
                        checked={isAdmin} 
                        onCheckedChange={(checked) => setIsAdmin(checked === true)} 
                        className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      >
                        <CheckboxPrimitive.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <Form.Label className='ml-2' htmlFor='isAdmin'>Admin</Form.Label>
                    </div>
                  </div>
                </Form.Control>

                {/* Validation messages */}
                <Form.Message match="valueMissing" className="text-xs text-red-600">
                  Please select at least one role
                </Form.Message>

              </Form.Field>


              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                >
                  Cancel
                </button>
                <Form.Submit asChild>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-[#19183B] text-white rounded-xl font-semibold hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Create User
                      </>
                    )}
                  </button>
                </Form.Submit>
              </div>
            </Form.Root>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit User Dialog */}
      <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-[#A1C2BD]">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-[#19183B] mb-4">
              <div className="p-2 bg-[#708993] rounded-lg">
                <Pencil className="w-6 h-6 text-white" />
              </div>
              Edit User Account
            </Dialog.Title>

            <Form.Root onSubmit={handleEditSubmit} className="space-y-5">
              <Form.Field name="username">
                <Form.Label className="text-sm font-semibold text-[#19183B] mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Form.Label>
                <Form.Control asChild>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="email">
                <Form.Label className="text-sm font-semibold text-[#19183B] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Form.Label>
                <Form.Control asChild>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name="password">
                <Form.Label className="text-sm font-semibold text-[#19183B] mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  New Password (leave blank to keep current)
                </Form.Label>
                <Form.Control asChild>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                  />
                </Form.Control>
              </Form.Field>

              <Form.Field name='role'>
                <Form.Label className="text-sm font-semibold text-[#19183B] flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role
                </Form.Label>

                {/* Hidden input for validation */}
                <Form.Control asChild>
                  <input
                    type="text"
                    value={isUser || isAdmin ? 'valid' : ''}
                    onChange={() => {}}
                    required
                    style={{ display: 'none' }}
                  />
                </Form.Control>
                
                <Form.Control asChild>
                  <div className='flex gap-4'>
                    <div className="flex items-center">
                      <CheckboxPrimitive.Root 
                        id="edit-isUser"
                        checked={isUser} 
                        onCheckedChange={(checked) => setIsUser(checked === true)} 
                        className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      >
                        <CheckboxPrimitive.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <Form.Label className='ml-2' htmlFor='edit-isUser'>User</Form.Label>
                    </div>
                    <div className="flex items-center">
                      <CheckboxPrimitive.Root 
                        id="edit-isAdmin"
                        checked={isAdmin} 
                        onCheckedChange={(checked) => setIsAdmin(checked === true)} 
                        className="w-4 h-4 bg-white border border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      >
                        <CheckboxPrimitive.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </CheckboxPrimitive.Indicator>
                      </CheckboxPrimitive.Root>
                      <Form.Label className='ml-2' htmlFor='edit-isAdmin'>Admin</Form.Label>
                    </div>
                  </div>
                </Form.Control>

                {/* Validation messages */}
                <Form.Message match="valueMissing" className="text-xs text-red-600">
                  Please select at least one role
                </Form.Message>
              </Form.Field>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
                >
                  Cancel
                </button>
                <Form.Submit asChild>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-[#708993] text-white rounded-xl font-semibold hover:bg-[#19183B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Update
                      </>
                    )}
                  </button>
                </Form.Submit>
              </div>
            </Form.Root>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-[#E7F2EF] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-200">
            <Dialog.Title className="flex items-center gap-3 text-2xl font-bold text-red-600 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              Delete User Account
            </Dialog.Title>

            <p className="text-[#708993] mb-6">
              Are you sure you want to delete the user account "{selectedUser?.username}"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-[#A1C2BD] text-[#19183B] rounded-xl font-semibold hover:bg-[#E7F2EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>

            <Dialog.Close className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#708993]" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default UserAccountManagement;