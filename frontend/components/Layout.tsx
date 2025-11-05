'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { clearAuth, getStoredUser, User } from '@/lib/auth';
import { notificationsAPI, searchAPI } from '@/lib/api';
import {
  Users,
  Briefcase,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Search,
  Settings,
  Lock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Custom Home Icon Component
const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18 21v-14" />
    <path d="M9 15l3 -3l3 3" />
    <path d="M15 10l3 -3l3 3" />
    <path d="M3 21l18 0" />
    <path d="M12 21l0 -9" />
    <path d="M3 6l3 -3l3 3" />
    <path d="M6 21v-18" />
  </svg>
);

// Custom Projects Icon Component
const ProjectsIcon = ({ className }: { className?: string }) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 3l-4 7h8z" />
    <path d="M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
  </svg>
);

// Custom Developer Icon Component
const DeveloperIcon = ({ className }: { className?: string }) => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M10 4l-8 8l8 8" />
    <path d="M14 4l8 8l-8 8" />
    <path d="M8 12h8" />
  </svg>
);

interface Notification {
  type: string;
  message: string;
  count: number;
  priority: string;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'client' | 'project' | 'assignment' | 'developer';
  href: string;
  subtitle: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [iconError, setIconError] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    clients: SearchResult[];
    projects: SearchResult[];
    assignments: SearchResult[];
    developers: SearchResult[];
  }>({ clients: [], projects: [], assignments: [], developers: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(storedUser);
    loadNotifications();
  }, [router]);

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ clients: [], projects: [], assignments: [], developers: [] });
      return;
    }

    try {
      const response = await searchAPI.search(query);
      setSearchResults(response.data.data || { clients: [], projects: [], assignments: [], developers: [] });
      setSearchOpen(true);
    } catch (error) {
      console.error('Failed to search');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    } else {
      setSearchResults({ clients: [], projects: [], assignments: [], developers: [] });
      setSearchOpen(false);
    }
  };

  const handleSearchResultClick = (href: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    router.push(href);
  };


  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const menuItems = [
    { icon: HomeIcon, label: 'Home', href: '/dashboard', roles: ['admin', 'manager', 'employee'] },
    { icon: Briefcase, label: 'Clients', href: '/clients', roles: ['admin', 'manager'] },
    { icon: ProjectsIcon, label: 'Projects', href: '/projects', roles: ['admin', 'manager', 'employee'] },
    { icon: FileText, label: 'Assignments', href: '/assignments', roles: ['admin', 'manager', 'employee'] },
    { icon: DeveloperIcon, label: 'Developers', href: '/developers', roles: ['admin', 'manager'] },
    { icon: Users, label: 'Users', href: '/users', roles: ['admin'] },
  ].filter(item => !user || item.roles.includes(user.role));

  // Split navigation items into main and bottom sections
  const mainNavItems = menuItems.slice(0, 6);
  const bottomNavItems = menuItems.slice(6);

  const highPriorityNotifications = notifications.filter(n => n.priority === 'high');

  const [isDesktop, setIsDesktop] = useState(false);

  // Handle window resize and desktop detection
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(false);
      }
    };
    if (typeof window !== 'undefined') {
      handleResize();
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.search-results')) {
          setSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSearchResults = [
    ...searchResults.clients,
    ...searchResults.projects,
    ...searchResults.assignments,
    ...searchResults.developers,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-gray via-background-primary to-background-gray">
      {/* Mobile & Tablet header */}
      <div className="lg:hidden bg-background-primary shadow-soft border-b border-border-light px-3 sm:px-4 py-3 flex items-center justify-between backdrop-blur-sm bg-background-primary/95 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-text-heading hover:bg-background-secondary hover:text-text-body transition-all"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-primary-main to-primary-hover bg-clip-text text-transparent truncate max-w-[140px] sm:max-w-none">
          Resource Management
        </h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-text-heading hover:bg-background-secondary hover:text-text-body transition-all"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex relative min-h-screen">
        {/* Sidebar */}
        <motion.aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed inset-y-0 left-0 top-0 bg-[#f3f3f3] z-50 h-screen overflow-hidden`}
          initial={{ width: 80 }}
          animate={{ width: isExpanded ? 220 : 80 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <nav className="flex-1 flex flex-col mt-2 h-full overflow-hidden">
            {/* Logo Section */}
            <div className="flex h-10 items-center justify-between mt-2 pl-4 pr-2 transition-opacity">
              {isExpanded ? (
                <>
                  {logoError ? (
                    <h1 className="text-sm font-semibold text-[#3B4154] truncate">
                      Resource Management
                    </h1>
                  ) : (
                    <img
                      src="/uploads/sutraLogo-Color.svg"
                      alt="SUTRA.ai Logo"
                      className="h-fit w-36"
                      onError={() => setLogoError(true)}
                    />
                  )}
                  {isHovered && (
                    <div className="relative group">
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 text-gray-500 hover:text-gray-700 transition-all duration-200"
                        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                      >
                        <ChevronsLeft
                          className={`w-6 h-full transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : 'rotate-180'
                          }`}
                        />
                      </button>
                      <div className="absolute right-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden p-2 rounded-lg text-[#3B4154] hover:bg-white transition-all"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="flex justify-center w-full h-10">
                  {isHovered ? (
                    <div className="relative group">
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-gray-500 hover:text-gray-800 transition-all duration-200"
                        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                      >
                        <ChevronsLeft
                          className={`w-6 h-6 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : 'rotate-180'
                          }`}
                        />
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                      </div>
                    </div>
                  ) : (
                    !iconError && (
                      <img
                        src="/uploads/sutra-icon.svg"
                        alt="SUTRA.ai Icon"
                        className="h-8 w-8"
                        onError={() => setIconError(true)}
                      />
                    )
                  )}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden absolute right-2 p-2 rounded-lg text-[#3B4154] hover:bg-white transition-all"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Main Navigation Items */}
            <div className="flex-1 space-y-1 mt-6 px-1 overflow-y-auto overflow-x-hidden">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                if (isExpanded) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group relative w-full h-[56px] flex items-center px-4 text-left text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md',
                        isActive
                          ? 'text-teal-600 hover:text-teal-800 bg-white font-[800]'
                          : 'font-semibold hover:text-[#3B4154] hover:font-bold'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSection"
                          className="absolute rounded-r-[4px] left-0 w-[6px] h-full bg-[#00B2A1]"
                        />
                      )}
                      <Icon className={cn(
                        'w-7 h-7 mr-2 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-teal-600' : 'text-[#3B4154] group-hover:text-[#3B4154]'
                      )} />
                      <span className="text-sm font-semibold group-hover:font-bold transition-all duration-200">
                        {item.label}
                      </span>
                    </Link>
                  );
                } else {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group relative w-full h-[60px] flex items-center justify-center text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md',
                        isActive
                          ? 'text-teal-800 hover:text-teal-800 bg-white'
                          : 'hover:text-[#3B4154]'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSection"
                          className="absolute rounded-r-[4px] left-0 w-[6px] h-full bg-[#00B2A1]"
                        />
                      )}
                      <Icon className={cn(
                        'w-7 h-7 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-teal-800' : 'text-[#3B4154]'
                      )} />
                    </Link>
                  );
                }
              })}
            </div>

            {/* Notifications Section */}
            <div className="px-1 mb-2">
              {isExpanded ? (
                <>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={cn(
                      'group relative w-full h-[48px] flex items-center px-4 text-left text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md font-semibold',
                      notificationsOpen ? 'bg-white' : ''
                    )}
                  >
                    <Bell className="w-7 h-7 mr-2 flex-shrink-0 transition-colors duration-200 text-[#3B4154]" />
                    <span className="text-sm font-semibold group-hover:font-bold transition-all duration-200">
                      Notifications
                    </span>
                    {highPriorityNotifications.length > 0 && (
                      <span className="ml-auto w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                      <div className="p-3 border-b border-gray-200">
                        <h3 className="font-semibold text-sm text-[#3B4154]">
                          Notifications ({notifications.length})
                        </h3>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center">
                            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">No notifications</p>
                          </div>
                        ) : (
                          notifications.map((notif, index) => (
                            <div
                              key={index}
                              className={cn(
                                'p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                                notif.priority === 'high' && 'bg-red-50 border-l-4 border-l-red-500'
                              )}
                            >
                              <p className="text-xs font-medium text-[#3B4154]">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1 capitalize">
                                {notif.type.replace('_', ' ')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsExpanded(true);
                    setNotificationsOpen(true);
                  }}
                  className="group relative w-full h-[60px] flex items-center justify-center text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md"
                  title="Notifications"
                >
                  <Bell className="w-7 h-7 flex-shrink-0 transition-colors duration-200 text-[#3B4154]" />
                  {highPriorityNotifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              )}
            </div>

            {/* Profile Section */}
            <div className="px-1 mb-2">
              {isExpanded ? (
                <Link
                  href="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group relative w-full h-[48px] flex items-center px-4 text-left text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md font-semibold',
                    pathname === '/profile' ? 'bg-white text-teal-600' : ''
                  )}
                >
                  <UserCircle className="w-7 h-7 mr-2 flex-shrink-0 transition-colors duration-200 text-[#3B4154]" />
                  <span className="text-sm font-semibold group-hover:font-bold transition-all duration-200">
                    Profile
                  </span>
                  {pathname === '/profile' && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute rounded-r-[4px] left-0 w-[6px] h-full bg-[#00B2A1]"
                    />
                  )}
                </Link>
              ) : (
                <Link
                  href="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group relative w-full h-[60px] flex items-center justify-center text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md',
                    pathname === '/profile' ? 'bg-white text-teal-800' : ''
                  )}
                  title="Profile"
                >
                  <UserCircle className="w-7 h-7 flex-shrink-0 transition-colors duration-200 text-[#3B4154]" />
                  {pathname === '/profile' && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute rounded-r-[4px] left-0 w-[6px] h-full bg-[#00B2A1]"
                    />
                  )}
                </Link>
              )}
            </div>

            {/* Bottom Navigation Section */}
            <div className="py-3 space-y-1 flex justify-center flex-col px-1 border-t border-gray-200/50 mt-auto">
              {isExpanded && process.env.NEXT_PUBLIC_USER_LOGO && (
                <div className="flex justify-center items-center py-2 mb-2">
                  <img
                    src={process.env.NEXT_PUBLIC_USER_LOGO}
                    alt="Company Logo"
                    className="h-8 max-w-[140px] object-contain"
                  />
                </div>
              )}

              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                if (isExpanded) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group w-full h-[48px] flex items-center px-4 text-left text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md font-semibold',
                        isActive
                          ? 'text-teal-800 hover:text-teal-800 bg-white'
                          : 'hover:text-[#3B4154] hover:font-bold'
                      )}
                    >
                      <Icon className={cn(
                        'w-7 h-7 mr-2 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-teal-800' : 'text-[#3B4154]'
                      )} />
                      <span className="text-sm font-semibold group-hover:font-bold transition-all duration-200">
                        {item.label}
                      </span>
                    </Link>
                  );
                } else {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group w-full h-[48px] flex items-center justify-center text-[#3B4154] transition-all duration-200 hover:bg-white rounded-md',
                        isActive
                          ? 'text-teal-800 hover:text-teal-800 bg-white'
                          : 'hover:text-[#3B4154]'
                      )}
                    >
                      <Icon className={cn(
                        'w-7 h-7 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-teal-800' : 'text-[#3B4154]'
                      )} />
                    </Link>
                  );
                }
              })}

              {/* Logout */}
              <div className={cn('w-full h-[48px]', isExpanded ? 'px-4' : 'px-1')}>
                <button
                  onClick={handleLogout}
                  className={cn(
                    'group w-full h-full flex items-center text-[#3B4154] transition-all duration-200 hover:bg-white hover:text-red-600 rounded-md font-semibold',
                    isExpanded ? 'px-0' : 'justify-center'
                  )}
                >
                  <LogOut className={cn(
                    'w-7 h-7 flex-shrink-0 transition-colors duration-200',
                    isExpanded && 'mr-2'
                  )} />
                  {isExpanded && (
                    <span className="text-sm font-semibold group-hover:font-bold transition-all duration-200">
                      Logout
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Footer - only show when expanded */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 mt-auto">
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Intelligence tech by{' '}
                  <Link
                    target="_blank"
                    href="https://sutra.ai"
                    className="text-[#00B2A1] hover:text-teal-700 transition-colors duration-200"
                  >
                    Sutra.AI
                  </Link>
                </p>
              </div>
            )}
          </nav>
        </motion.aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <motion.main 
          className="flex-1 min-w-0 w-full"
          initial={{ marginLeft: 0 }}
          animate={{ 
            marginLeft: isDesktop ? (isExpanded ? 220 : 80) : 0 
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Desktop header */}
          <header className="hidden lg:block bg-background-primary/80 backdrop-blur-sm shadow-soft border-b border-border-light px-4 xl:px-6 py-3 xl:py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-2xl relative" ref={searchInputRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                    placeholder="Search clients, projects, assignments, developers..."
                    className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border-light rounded-lg text-text-heading placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent"
                  />
                </div>
                {searchOpen && allSearchResults.length > 0 && (
                  <div className="search-results absolute top-full left-0 right-0 mt-2 bg-background-primary rounded-xl shadow-large border border-border-light z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-border-light">
                      <h3 className="font-semibold text-sm text-text-heading">Search Results</h3>
                    </div>
                    <div className="py-2">
                      {searchResults.clients.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase">Clients</div>
                          {searchResults.clients.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSearchResultClick(result.href)}
                              className="w-full px-3 py-2 text-left hover:bg-background-secondary transition-colors"
                            >
                              <div className="font-medium text-sm text-text-heading">{result.name}</div>
                              <div className="text-xs text-text-muted">{result.subtitle}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.projects.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase">Projects</div>
                          {searchResults.projects.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSearchResultClick(result.href)}
                              className="w-full px-3 py-2 text-left hover:bg-background-secondary transition-colors"
                            >
                              <div className="font-medium text-sm text-text-heading">{result.name}</div>
                              <div className="text-xs text-text-muted">{result.subtitle}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.assignments.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase">Assignments</div>
                          {searchResults.assignments.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSearchResultClick(result.href)}
                              className="w-full px-3 py-2 text-left hover:bg-background-secondary transition-colors"
                            >
                              <div className="font-medium text-sm text-text-heading">{result.name}</div>
                              <div className="text-xs text-text-muted">{result.subtitle}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.developers.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase">Developers</div>
                          {searchResults.developers.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSearchResultClick(result.href)}
                              className="w-full px-3 py-2 text-left hover:bg-background-secondary transition-colors"
                            >
                              <div className="font-medium text-sm text-text-heading">{result.name}</div>
                              <div className="text-xs text-text-muted">{result.subtitle}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="p-4 sm:p-6 lg:p-6 xl:p-8 max-w-full overflow-x-hidden">{children}</div>
        </motion.main>
      </div>
    </div>
  );
}
