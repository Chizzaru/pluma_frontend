/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { useSettings } from '@/hooks/useSettings';

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
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isFullScreen } = useSettings();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      label: 'Uploads',
      path: '/documents/uploads',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'My Documents',
      path: '/documents/my-documents',
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
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      label: 'Sign PDF',
      path: '/sign',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Verify PDF',
      path: '/verify',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      label: 'Batch Sign',
      path: '/batch-sign',
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
    },
    { type: 'divider' },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'Audit Log',
      path: '/audit',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      label: 'Users',
      path: '/users',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      ),
      label: 'Offices',
      path: '/offices',
    },
  ]);
  
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
    
    setMenuItems(prev => prev.map((item, i) => {
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
    if (!user?.username) return 'AU'; // Fallback to 'AU' if no username
    
    const username = user.username.trim();
    if (username.length === 0) return 'AU';
    
    // Get first letter of the username
    return username.charAt(0).toUpperCase();
  };

  const renderMenuItem = (item: MenuItem, index: number, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = item.path ? isActive(item.path) : false;
    const hasActiveChild = item.children?.some(child => child.path && isActive(child.path));

    if (item.type === 'divider') {
      return <hr key={`divider-${index}`} className="my-3 border-t border-[#2a2850] opacity-60" />;
    }

    return (
      <div key={item.label} className="space-y-1">
        <button
          onClick={() => handleMenuItemClick(item, index)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            isItemActive || hasActiveChild
              ? 'bg-[#A1C2BD] text-[#19183B] font-semibold shadow-lg'
              : 'text-white hover:bg-[#2a2850]'
          } ${level > 0 ? 'ml-4' : ''}`}
          title={isCollapsed ? item.label : ''}
        >
          {item.icon}
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
            {item.children?.map((child, _childIndex) => (
              <button
                key={child.label}
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
            {menuItems.map((item, index) => renderMenuItem(item, index))}
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