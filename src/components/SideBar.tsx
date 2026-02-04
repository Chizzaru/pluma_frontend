import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Files, Gauge, HatGlasses, Headset, Share2, Unplug, Users } from 'lucide-react';
import { useDocWebSocket } from '@/hooks/useDocWebSocket';
import api from '@/api/axiosInstance';

interface SidebarProps {
  children?: React.ReactNode;
}

interface MenuItem {
  icon?: React.ReactNode;
  label?: string;
  path?: string;
  children?: MenuItem[];
  isOpen?: boolean;
  type?: 'divider';
  badge?: string | number | null;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isFullScreen } = useSettings();

  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [notificationMenuItems, setNotificationMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        if (!user?.id) return;
        
        const response = await api.get(`v1/notifications/unread-count/${user.id}`);
        console.log('Fetched notification count:', response.data);
        setNotificationCount(response.data);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 3000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleNotificationUpdate = useCallback((count: number) => {
    console.log('WebSocket notification update:', count);
    setNotificationCount(count);
  }, []);

  useDocWebSocket(undefined, handleNotificationUpdate);

  // Define menu items for admin
  const menusForAdmin: MenuItem[] = [
    {
      icon: <Gauge />,
      label: 'Dashboard',
      path: '/dashboard',
    },
    {
      icon: <Headset />,
      label: 'Support',
      path: '#'
    },
    {
      icon: <Users />,
      label: 'Users',
      path: '/users',
    },
    {
      icon: <HatGlasses />,
      label: 'Audit Logs',
      path: '#',
    },
    { type: 'divider' },
    {
      icon: <Unplug />,
      label: 'API Connect',
      path: '/connect',
    },
  ];

  // Define menu items for regular user
  const menusForUser: MenuItem[] = [
    {
      icon: <Files />,
      label: 'My Documents',
      path: '/my-documents',
    },
    {
      icon: <Share2 />,
      label: 'Shared',
      path: '/shared',
    },
    {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
          />
        </svg>
      ),
      label: 'Notifications',
      path: '/notifications',
      badge: notificationCount > 0 ? notificationCount : null, // Use null instead of undefined
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: 'Signatures',
      path: '/signatures',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: 'Certificates',
      path: '/certificates',
    }
  ];

  // Update menu items whenever notificationCount changes
  useEffect(() => {
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');
    const baseMenu = isAdmin ? menusForAdmin : menusForUser;
    
    // Update the notification menu item with current count
    const updatedMenu = baseMenu.map(item => {
      if (item.label === 'Notifications') {
        return {
          ...item,
          badge: notificationCount > 0 ? notificationCount : null
        };
      }
      return item;
    });
    
    setNotificationMenuItems(updatedMenu);
  }, [notificationCount, user?.roles]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Logout triggered');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleSubMenu = (index: number) => {
    if (isCollapsed) return;
    
    setNotificationMenuItems(prev => prev.map((item, i) => {
      if (i === index && item.children) {
        return { ...item, isOpen: !item.isOpen };
      }
      return item;
    }));
  };

  const handleMenuItemClick = (item: MenuItem, index: number) => {
    if (item.children) {
      toggleSubMenu(index);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // Function to get user initials from username
  const getUserInitials = () => {
    if (!user?.username) return 'AU';
    
    const username = user.username.trim();
    if (username.length === 0) return 'AU';
    
    return username.charAt(0).toUpperCase();
  };

  const renderMenuItem = (item: MenuItem, index: number, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = item.path ? isActive(item.path) : false;
    const hasActiveChild = item.children?.some(child => child.path && isActive(child.path));
    const hasBadge = item.badge !== null && item.badge !== undefined && item.badge !== 0;

    if (item.type === 'divider') {
      return <hr key={`divider-${index}`} className="my-3 border-t border-[#2a2850] opacity-60" />;
    }

    return (
      <div key={item.label || index} className="space-y-1">
        <button
          onClick={() => handleMenuItemClick(item, index)}
          className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            isItemActive || hasActiveChild
              ? 'bg-[#A1C2BD] text-[#19183B] font-semibold shadow-lg'
              : 'text-white hover:bg-[#2a2850]'
          } ${level > 0 ? 'ml-4' : ''}`}
          title={isCollapsed ? item.label : ''}
        >
          <div className="relative">
            {item.icon}
            {hasBadge && (
              <div className={`
                absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full 
                bg-red-500 text-xs text-white font-bold px-1 z-10
                ${isCollapsed ? '-right-1' : ''}
              `}>
                {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {hasChildren && (
                <svg
                  className={`w-4 h-4 transition-transform ${item.isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </>
          )}
        </button>

        {/* Sub-menu items */}
        {!isCollapsed && hasChildren && item.isOpen && (
          <div className="space-y-1">
            {item.children?.map((child, childIndex) => (
              <button
                key={child.label || childIndex}
                onClick={() => child.path && navigate(child.path)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ml-4 ${
                  isActive(child.path || '')
                    ? 'bg-[#708993] text-white font-medium'
                    : 'text-gray-300 hover:bg-[#2a2850] hover:text-white'
                }`}
              >
                {child.icon}
                <span>{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {!isFullScreen && (
        <aside
          className={`${isCollapsed ? 'w-20' : 'w-64'
            } bg-[#19183B] text-white transition-all duration-300 flex flex-col shadow-2xl`
          }
        >
          {/* Logo/Header */}
          <div className="p-6 flex items-center justify-between border-b border-[#2a2850]">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <img src={`${import.meta.env.BASE_URL}new-logo.svg`} alt="new-logo.svg" width="40px"/>
                <div className='flex flex-col'>
                  <span className="font-bold text-lg"> {import.meta.env.VITE_APP_NAME} </span>
                  <span className='text-[10px] font-semibold'>NCIP | Version { import.meta.env.VITE_APP_VERSION }</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-[#2a2850] rounded-lg transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {notificationMenuItems.map((item, index) => renderMenuItem(item, index))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-[#2a2850]">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} mb-3`}>
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="text-sm font-semibold">{user?.username}</div>
                  <div className="text-xs text-[#A1C2BD]">{user?.email}</div>
                </div>
              )}
              <div className="w-10 h-10 bg-[#708993] rounded-full flex items-center justify-center text-sm font-bold">
                {getUserInitials()}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
              title={isCollapsed ? 'Logout' : ''}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      )}
      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#E7F2EF]">
        {children}
      </main>
    </div>
  );
};

export default Sidebar;