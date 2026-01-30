/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import * as Form from '@radix-ui/react-form';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';

import { Checkbox } from "@/components/ui/checkbox"
import toast from 'react-hot-toast';

import { ChevronDown, Check, Pencil, Trash2, X, Plus, Search, ChevronLeft, ChevronRight, User, Mail, Key, Shield } from 'lucide-react';

import api from '@/api/axiosInstance';
import type { Role } from '@/types/auth';

interface UserAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'ROLE_ADMIN' | 'ROLE_USER';
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
}


const UserAccountManagement: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Pagination and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
  
    const [isUser, setIsUser] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
  
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

  // Load users from API
  const loadUsers = async (page: number = pagination.currentPage, limit: number = pagination.itemsPerPage) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(searchTerm && { search: searchTerm })
      };

      const response = await api.get("v1/users", { params });
      const data = response.data;

      console.log("API Response:", data); // Debug log
      
      setUsers(response.data.data);

      setPagination(prev => ({
        ...prev,
        currentPage: response.data.total.currentPage,
        totalPages: response.data.total.totalPages,
        totalItems: response.data.total.totalItems,
        itemsPerPage: response.data.total.itemsPerPage, // Fixed: was pageSize, now itemsPerPage
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
  const getDisplayRange = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const endIndex = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
    return { startIndex, endIndex };
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password ) return;

    setIsSubmitting(true);

    try {
      const roles: Array<Role> = []
      if (isUser) roles.push("ROLE_USER")
      if (isAdmin) roles.push("ROLE_ADMIN")
      
      const response = await api.post("auth/register", {
        username, email, password, roles
      })

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

      const response = await api.put(`v1/users/${selectedUser.id}`, {
        username,
        email,
        ...(password && { password }),
        roles
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

  const getRoleBadgeColor = (roleName: string) => {
    return roleName === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const { startIndex, endIndex } = getDisplayRange();

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
                  <User className="w-6 h-6 text-[#19183B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#19183B]">User Account Management</h1>
              </div>
              <p className="text-[#708993] ml-14">Create, manage, and organize user accounts</p>
            </div>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2 bg-[#19183B] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#708993] transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#708993] w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by username, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#708993] whitespace-nowrap">Show:</span>
                <Select.Root 
                  value={pagination.itemsPerPage.toString()} 
                  onValueChange={(value) => handleItemsPerPageChange(Number(value))}
                >
                  <Select.Trigger className="px-3 py-2 border-2 border-[#A1C2BD] rounded-lg focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all flex items-center justify-between bg-white min-w-[80px]">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown className="w-4 h-4 text-[#708993]" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white rounded-lg shadow-xl border-2 border-[#A1C2BD] overflow-hidden">
                      <Select.Viewport>
                        {itemsPerPageOptions.map(option => (
                          <Select.Item 
                            key={option} 
                            value={option.toString()}
                            className="px-3 py-2 hover:bg-[#E7F2EF] cursor-pointer outline-none flex items-center justify-between"
                          >
                            <Select.ItemText>{option}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check className="w-4 h-4 text-[#19183B]" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <span className="text-sm text-[#708993] whitespace-nowrap">per page</span>
              </div>

              {selectedUsers.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedUsers.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#E7F2EF]/50 border-b border-[#A1C2BD]">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUsers.size === users.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-[#19183B] border-2 border-[#A1C2BD] rounded focus:ring-[#708993]"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Updated</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#19183B]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#A1C2BD]/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-[#708993]">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#A1C2BD] border-t-[#19183B] rounded-full animate-spin mb-4"></div>
                        <p className="text-lg">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-[#708993]">
                      <div className="flex flex-col items-center justify-center">
                        <User className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg mb-2">No users found</p>
                        <p className="text-sm">
                          {searchTerm ? 'Try adjusting your search terms' : 'Click "Add User" to create your first user account'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#E7F2EF]/30 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-[#19183B] border-2 border-[#A1C2BD] rounded focus:ring-[#708993]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#A1C2BD] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[#19183B]" />
                          </div>
                          <span className="font-medium text-[#19183B]">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#19183B]">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.roles && user.roles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {user.roles.map((role: any, index) => (
                              <span 
                                key={role.id || index} 
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role.name)}`}
                              >
                                <Shield className="w-3 h-3" />
                                {role.name.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#708993]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#708993]">
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditDialog(user)}
                            className="flex items-center gap-2 bg-[#708993] text-white px-3 py-2 rounded-lg hover:bg-[#19183B] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteDialog(user)}
                            className="flex items-center gap-2 bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#A1C2BD] bg-[#E7F2EF]/50 gap-4">
              <div className="text-sm text-[#708993]">
                Showing {startIndex} to {endIndex} of {pagination.totalItems} entries
              </div>
              
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="flex items-center gap-2 px-3 py-2 border border-[#A1C2BD] rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {getPageNumbers().map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 flex items-center justify-center border rounded-lg transition-colors ${
                        pagination.currentPage === page
                          ? 'bg-[#19183B] text-white border-[#19183B]'
                          : 'border-[#A1C2BD] hover:bg-white text-[#19183B]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* Ellipsis for more pages */}
                  {pagination.totalPages > getPageNumbers()[getPageNumbers().length - 1] && (
                    <span className="w-10 h-10 flex items-center justify-center text-[#708993]">
                      ...
                    </span>
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center gap-2 px-3 py-2 border border-[#A1C2BD] rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
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
                    <div>
                      <Checkbox 
                        name='isUser' 
                        checked={isUser} 
                        onCheckedChange={(checked) => setIsUser(checked === true)} 
                      />
                      <Form.Label className='ml-2' htmlFor='isUser'>User</Form.Label>
                    </div>
                    <div>
                      <Checkbox 
                        name='isAdmin' 
                        checked={isAdmin} 
                        onCheckedChange={(checked) => setIsAdmin(checked === true)} 
                      />
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
                    <div>
                      <Checkbox 
                        name='isUser' 
                        checked={isUser} 
                        onCheckedChange={(checked) => setIsUser(checked === true)} 
                      />
                      <Form.Label className='ml-2' htmlFor='isUser'>User</Form.Label>
                    </div>
                    <div>
                      <Checkbox 
                        name='isAdmin' 
                        checked={isAdmin} 
                        onCheckedChange={(checked) => setIsAdmin(checked === true)} 
                      />
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