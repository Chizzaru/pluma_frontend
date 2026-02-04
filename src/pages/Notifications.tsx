import React, { useState, useEffect } from 'react';
import { 
  Bell, Search, ChevronLeft, ChevronRight, Check, X, 
  FileText, Users, Share2, Send, Clock, 
  CheckCircle, Trash2, Eye, User, XCircle
} from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Dialog from '@radix-ui/react-dialog';
import api from '@/api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '@/auth/useAuth';

interface Notification {
  id: number;
  type: string;
  fromUser: FromUser;
  title: string;
  message: string;
  opened: boolean;
  createdAt: string;
  readAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface FromUser {
  id: number;
  username: string;
}

interface NotificationModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead
}) => {
  if (!notification) return null;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_shared':
        return <Share2 className="w-6 h-6 text-blue-600" />;
      case 'document_forwarded':
        return <Send className="w-6 h-6 text-purple-600" />;
      case 'signature_request':
        return <FileText className="w-6 h-6 text-amber-600" />;
      case 'signature_completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'document_unshared':
        return <X className="w-6 h-6 text-red-600" />;
      case 'user_mentioned':
        return <Users className="w-6 h-6 text-indigo-600" />;
      default:
        return <Bell className="w-6 h-6 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'document_shared':
        return 'bg-blue-100';
      case 'document_forwarded':
        return 'bg-purple-100';
      case 'signature_request':
        return 'bg-amber-100';
      case 'signature_completed':
        return 'bg-green-100';
      case 'document_unshared':
        return 'bg-red-100';
      case 'user_mentioned':
        return 'bg-indigo-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-xl z-50 max-h-[90vh] overflow-hidden">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${getNotificationBgColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div>
                  <Dialog.Title className="text-xl font-bold text-[#19183B]">
                    {notification.title}
                  </Dialog.Title>
                  <p className="text-sm text-gray-500">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Sender Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">From</p>
                  <p className="font-semibold text-[#19183B]">
                    {notification.fromUser?.username || 'Unknown User'}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Message</h3>
              <div className="p-4 bg-gray-50 rounded-lg min-h-[100px]">
                <p className="text-gray-800 whitespace-pre-wrap">{notification.message}</p>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${notification.opened ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className={`font-medium ${notification.opened ? 'text-green-700' : 'text-blue-700'}`}>
                    {notification.opened ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>
              
              {notification.readAt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Read At</p>
                  <p className="font-medium text-gray-900">{formatDate(notification.readAt)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t">
              {!notification.opened && (
                <button
                  onClick={() => {
                    onMarkAsRead(notification.id);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Read
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    offset: 0,
    hasNext: false,
    hasPrevious: false,
  });

  useEffect(() => {
    loadNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchQuery]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading notifications for user:', user);
    
      if (!user?.id) {
        console.log('❌ No user ID available');
        toast.error('Please log in first');
        return;
      }

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        offset: currentPage * itemsPerPage,
        user_id: user?.id,
        user_roles: user?.roles || [],
        search: searchQuery || undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      };

      const response = await api.get("/v1/notifications", { params });
      const data = response.data;
      
      setNotifications(data.data || []);
      setPagination({
        currentPage: data.pagination.currentPage ?? 0,
        totalItems: data.pagination.totalItems ?? 0,
        totalPages: data.pagination.totalPages ?? 1,
        itemsPerPage: data.pagination.itemsPerPage ?? 10,
        offset: data.pagination.offset ?? 0,
        hasNext: data.pagination.hasNext ?? false,
        hasPrevious: data.pagination.hasPrevious ?? false,
      });

      console.log('✅ Notifications loaded:', data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error(`Error fetching notifications: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter notifications based on read status
  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch = 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.fromUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'unread' ? !notif.opened :
      notif.opened;
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.opened).length;

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await api.patch(`/v1/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, opened: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.patch('/v1/notifications/mark-all-read', {
        userId: user?.id
      });
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          opened: true, 
          readAt: new Date().toISOString() 
        }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/v1/notifications/${notificationId}`);
      
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setSelectedItems(prev => prev.filter(id => id !== notificationId));
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    if (selectedItems.length === 0) return;

    try {
      await Promise.all(
        selectedItems.map(id => api.delete(`/v1/notifications/${id}`))
      );
      
      setNotifications(prev => prev.filter(notif => !selectedItems.includes(notif.id)));
      setSelectedItems([]);
      
      toast.success(`Deleted ${selectedItems.length} notification(s)`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Toggle item selection
  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Open notification modal
  const openNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
    
    // Auto-mark as read if unopened
    if (!notification.opened) {
      markAsRead(notification.id);
    }
  };

  // Close notification modal
  const closeNotificationModal = () => {
    setIsModalOpen(false);
    setSelectedNotification(null);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_shared':
        return <Share2 className="w-5 h-5 text-blue-600" />;
      case 'document_forwarded':
        return <Send className="w-5 h-5 text-purple-600" />;
      case 'signature_request':
        return <FileText className="w-5 h-5 text-amber-600" />;
      case 'signature_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'document_unshared':
        return <X className="w-5 h-5 text-red-600" />;
      case 'user_mentioned':
        return <Users className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get notification background color based on type
  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'document_shared':
        return 'bg-blue-50';
      case 'document_forwarded':
        return 'bg-purple-50';
      case 'signature_request':
        return 'bg-amber-50';
      case 'signature_completed':
        return 'bg-green-50';
      case 'document_unshared':
        return 'bg-red-50';
      case 'user_mentioned':
        return 'bg-indigo-50';
      default:
        return 'bg-gray-50';
    }
  };

  // Format relative date
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="relative min-h-screen bg-[#E7F2EF] p-8">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-md"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)` }}
        />
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#A1C2BD] rounded-lg relative">
                  <Bell className="w-6 h-6 text-[#19183B]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#19183B]">Notifications</h1>
                  <p className="text-[#708993]">
                    Stay updated with your document activities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#19183B] text-white rounded-lg hover:bg-[#708993] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark all as read
                </button>
              </div>
            </div>
          </div>

          {/* Selection Bar */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-[#A1C2BD]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">
                      {selectedItems.length} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={deleteSelected}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#A1C2BD]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 relative min-w-[300px]">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#708993]" />
                <input
                  type="text"
                  placeholder="Search notifications by title, message, or sender..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#A1C2BD] rounded-xl focus:ring-2 focus:ring-[#708993] focus:border-[#708993] outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#19183B]">Filter:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'unread' | 'read')}
                  className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value="all">All ({notifications.length})</option>
                  <option value="unread">Unread ({unreadCount})</option>
                  <option value="read">Read ({notifications.length - unreadCount})</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#19183B]">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="px-4 py-3 border-2 border-[#A1C2BD] rounded-xl bg-white focus:ring-2 focus:ring-[#708993] outline-none transition-all cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1C2BD] overflow-hidden">
            <div className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-[#A1C2BD] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-[#708993]">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#708993]">
                  <Bell className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">
                    {searchQuery ? 'No notifications found' : 'No notifications yet'}
                  </p>
                  <p className="text-sm">
                    {searchQuery
                      ? 'Try adjusting your search or filter'
                      : 'When you receive notifications, they will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                        notif.opened
                          ? 'bg-white border-gray-200'
                          : 'bg-blue-50 border-blue-300'
                      } ${selectedItems.includes(notif.id) ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={(e) => {
                        // Don't open modal if clicking on checkbox or action buttons
                        if (!(e.target as HTMLElement).closest('button, [role="checkbox"]')) {
                          openNotificationModal(notif);
                        }
                      }}
                    >
                      <Checkbox.Root
                        checked={selectedItems.includes(notif.id)}
                        onCheckedChange={() => toggleItemSelection(notif.id)}
                        className="w-5 h-5 mt-1 bg-white border-2 border-gray-300 rounded flex items-center justify-center data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox.Indicator>
                          <Check className="w-3 h-3 text-white" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>

                      <div className={`p-3 rounded-lg ${getNotificationBgColor(notif.type)}`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className={`font-semibold ${notif.opened ? 'text-gray-900' : 'text-[#19183B]'}`}>
                              {notif.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <User className="w-3 h-3" />
                              <span>From: {notif.fromUser?.username || 'Unknown User'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {formatRelativeDate(notif.createdAt)}
                          </div>
                        </div>
                        
                        <p className={`text-sm mb-3 line-clamp-2 ${notif.opened ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {!notif.opened && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              Mark as read
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>

                          {notif.opened && notif.readAt && (
                            <span className="text-xs text-gray-500 ml-auto">
                              Read {formatRelativeDate(notif.readAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-[#A1C2BD] p-6 bg-[#E7F2EF]/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#708993]">
                    Page {pagination.currentPage + 1} of {pagination.totalPages} • {pagination.totalItems} items
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={!pagination.hasPrevious}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i;
                        } else if (currentPage <= 2) {
                          pageNum = i;
                        } else if (currentPage >= pagination.totalPages - 3) {
                          pageNum = pagination.totalPages - 5 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-medium ${
                              currentPage === pageNum
                                ? 'bg-[#19183B] text-white'
                                : 'border border-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD] hover:text-white'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages - 1, prev + 1))}
                      disabled={!pagination.hasNext}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-[#A1C2BD] text-[#19183B] rounded-lg font-semibold hover:bg-[#A1C2BD] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* Notification Detail Modal */}
      <NotificationModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={closeNotificationModal}
        onMarkAsRead={markAsRead}
      />
    </>
  );
};

export default Notifications;