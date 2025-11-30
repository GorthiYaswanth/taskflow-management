import React, { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { tasksAPI, projectsAPI, authAPI } from '../../services/api';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  FolderOpen,
  Users,
  User,
  LogOut,
  MoreHorizontal,
  X,
  Bell,
  Moon,
  Sun,
  Search,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('tf_sidebar_collapsed') === '1';
    } catch (e) {
      return false;
    }
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: notifResp } = useQuery(
    'notifications',
    tasksAPI.getNotifications,
    { refetchInterval: 15000 }
  );
  const notificationsRaw = notifResp?.data?.items || notifResp?.items || [];
  const [clearedAt, setClearedAt] = useState(() => Number(window.localStorage.getItem('tf_cleared_at') || 0));
  const [clearedNotifications, setClearedNotifications] = useState(() => {
    const stored = window.localStorage.getItem('tf_cleared_notifications');
    return stored ? JSON.parse(stored) : [];
  });
  
  const notifications = useMemo(() => {
    let filtered = notificationsRaw || [];
    
    // Filter by cleared timestamp
    if (clearedAt) {
      filtered = filtered.filter((n) => new Date(n.created_at).getTime() > clearedAt);
    }
    
    // Filter by individually cleared notifications
    filtered = filtered.filter((n) => !clearedNotifications.includes(`${n.type}-${n.id}`));
    
    return filtered;
  }, [notificationsRaw, clearedAt, clearedNotifications]);

  const clearIndividualNotification = (notification) => {
    const notificationId = `${notification.type}-${notification.id}`;
    const newCleared = [...clearedNotifications, notificationId];
    setClearedNotifications(newCleared);
    window.localStorage.setItem('tf_cleared_notifications', JSON.stringify(newCleared));
  };

  // Search functionality
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search across different data sources
      const searchPromises = [
        tasksAPI.getTasks({ search: query }),
        projectsAPI.getProjects({ search: query }),
        authAPI.getEmployees({ search: query })
      ];

      const [tasksRes, projectsRes, employeesRes] = await Promise.allSettled(searchPromises);
      
      const results = [];
      
      // Process tasks
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.data) {
        const tasks = Array.isArray(tasksRes.value.data) ? tasksRes.value.data : tasksRes.value.data.results || [];
        tasks.forEach(task => {
          if (task.title?.toLowerCase().includes(query.toLowerCase()) || 
              task.description?.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type: 'task',
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              project: task.project_name
            });
          }
        });
      }

      // Process projects
      if (projectsRes.status === 'fulfilled' && projectsRes.value?.data) {
        const projects = Array.isArray(projectsRes.value.data) ? projectsRes.value.data : projectsRes.value.data.results || [];
        projects.forEach(project => {
          if (project.name?.toLowerCase().includes(query.toLowerCase()) || 
              project.description?.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type: 'project',
              id: project.id,
              title: project.name,
              description: project.description,
              status: project.status,
              progress: project.progress_percentage
            });
          }
        });
      }

      // Process employees
      if (employeesRes.status === 'fulfilled' && employeesRes.value?.data) {
        const employees = Array.isArray(employeesRes.value.data) ? employeesRes.value.data : employeesRes.value.data.results || [];
        employees.forEach(employee => {
          const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
          if (fullName.toLowerCase().includes(query.toLowerCase()) || 
              employee.email?.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type: 'employee',
              id: employee.id,
              title: fullName,
              description: employee.email,
              role: employee.role
            });
          }
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Kanban', href: '/kanban', icon: Kanban },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    ...(user?.role === 'scrum_master' ? [{ name: 'Users', href: '/users', icon: Users }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className={`fixed inset-y-0 left-0 flex w-64 flex-col shadow-xl transform transition-transform duration-300 ease-in-out ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-end px-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} lg:flex-col transition-all duration-300 ease-in-out`}>
        <div className={`flex flex-col flex-grow border-r ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all duration-300`}>
          <div className="flex h-16 items-center px-4 justify-end">
            {/* Collapse/Expand button (no brand inside sidebar) */}
            <button
              onClick={() => {
                const next = !sidebarCollapsed;
                setSidebarCollapsed(next);
                try { window.localStorage.setItem('tf_sidebar_collapsed', next ? '1' : '0'); } catch(e) {}
              }}
              className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'}`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'} py-4 space-y-2 overflow-hidden`}>
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                      : isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => {
                    // Auto-collapse on desktop
                    setSidebarCollapsed(true);
                    try { window.localStorage.setItem('tf_sidebar_collapsed', '1'); } catch(e) {}
                  }}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5`} />
                  <span className={`${sidebarCollapsed ? 'hidden' : ''}`}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}>
        {/* Top bar */}
        <div className={`sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 lg:px-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="relative flex items-center gap-3">
            {/* Brand Title */}
            <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TaskFlow</h1>
            {/* Sidebar Toggle (three dots) */}
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(true);
                } else {
                  const next = !sidebarCollapsed;
                  setSidebarCollapsed(next);
                  try { window.localStorage.setItem('tf_sidebar_collapsed', next ? '1' : '0'); } catch(e) {}
                }
              }}
              className={`lg:hidden p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Open menu"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4 ml-auto">
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(true)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className={`relative ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setShowNotif(!showNotif)}>
                <Bell className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium leading-none text-white bg-red-600 rounded-full">
                    {Math.min(notifications.length, 9)}+
                  </span>
                )}
              </button>
              {showNotif && (
                <div className={`absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto border rounded-xl shadow-2xl z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-600' : 'bg-blue-100'}`}>
                        <Bell className={`h-4 w-4 ${isDarkMode ? 'text-white' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                        </div>
                      </div>
                    </div>
                    <button
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      onClick={() => {
                        const now = Date.now();
                        window.localStorage.setItem('tf_cleared_at', String(now));
                        setClearedAt(now);
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {notifications.length === 0 ? (
                      <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Bell className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className="text-sm font-medium">No notifications</p>
                        <p className="text-xs mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div key={`${n.type}-${n.id}`} className={`group p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-white'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${n.type === 'activity' ? (isDarkMode ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-700') : (n.type === 'due_soon' ? (isDarkMode ? 'bg-yellow-600 text-yellow-100' : 'bg-yellow-100 text-yellow-700') : (isDarkMode ? 'bg-green-600 text-green-100' : 'bg-green-100 text-green-700'))}`}>
                                  {n.type === 'activity' ? 'Activity' : (n.type === 'due_soon' ? 'Due Soon' : 'Message')}
                                </span>
                                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                              <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {n.type === 'activity' ? (
                                  <>
                                    <p className="font-medium line-clamp-2">{n.description}</p>
                                    {n.task_title && (<p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Task: {n.task_title}</p>)}
                                  </>
                                ) : n.type === 'due_soon' ? (
                                  <>
                                    <p className="font-medium line-clamp-2">{n.content}</p>
                                    {n.project_name && (<p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Project: {n.project_name}</p>)}
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium line-clamp-2">{n.content}</p>
                                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>From: {n.author_name}{n.project_name ? ` • ${n.project_name}` : ''}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => clearIndividualNotification(n)}
                              className={`ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                              title="Clear notification"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || '')}</p>
                <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.role?.replace('_', ' ')}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Link
                  to="/profile"
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <User className="h-6 w-6" />
                </Link>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Logout"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className={`p-4 lg:p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {children}
        </main>

        {/* Logout Confirmation Modal (in-page) */}
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-900/40" onClick={() => setShowLogoutModal(false)} />
            <div className={`relative rounded-lg shadow-xl w-full max-w-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Logout</h3>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>For security, please enter your password to logout.</p>
              <input
                type="password"
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                placeholder="Enter your password"
                value={logoutPassword}
                onChange={(e) => setLogoutPassword(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  className={`px-4 py-2 text-sm rounded-md border ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => {
                    setShowLogoutModal(false);
                    setLogoutPassword('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-md text-white ${logoutPassword ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
                  disabled={!logoutPassword}
                  onClick={() => {
                    // Optionally verify password with backend before logout
                    logout();
                    setShowLogoutModal(false);
                    setLogoutPassword('');
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Modal */}
        {showSearch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowSearch(false)} />
            <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-600' : 'bg-blue-100'}`}>
                    <Search className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Search</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Search across all your data</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSearch(false)}
                  className={`absolute top-4 right-4 p-2 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search tasks, projects, users..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    autoFocus
                  />
                </div>
                
                {/* Search Results */}
                <div className="mt-6">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Searching...</span>
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="space-y-3">
                      {searchResults.length > 0 ? (
                        <>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                          </div>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {searchResults.map((result, index) => (
                              <div
                                key={`${result.type}-${result.id}-${index}`}
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                                }`}
                                onClick={() => {
                                  // Navigate based on result type
                                  if (result.type === 'task') {
                                    window.location.href = `/tasks`;
                                  } else if (result.type === 'project') {
                                    window.location.href = `/projects`;
                                  } else if (result.type === 'employee') {
                                    window.location.href = `/users`;
                                  }
                                  setShowSearch(false);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        result.type === 'task' 
                                          ? (isDarkMode ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-700')
                                          : result.type === 'project'
                                          ? (isDarkMode ? 'bg-green-600 text-green-100' : 'bg-green-100 text-green-700')
                                          : (isDarkMode ? 'bg-purple-600 text-purple-100' : 'bg-purple-100 text-purple-700')
                                      }`}>
                                        {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                      </span>
                                      {result.status && (
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                          {result.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {result.title}
                                    </h4>
                                    {result.description && (
                                      <p className={`text-sm mt-1 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {result.description}
                                      </p>
                                    )}
                                    {result.project && (
                                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Project: {result.project}
                                      </p>
                                    )}
                                    {result.role && (
                                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Role: {result.role.replace('_', ' ').toUpperCase()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Search className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                          <p className="text-sm font-medium">No results found</p>
                          <p className="text-xs mt-1">Try different keywords or check spelling</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Search className={`h-12 w-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className="text-sm font-medium">Start typing to search</p>
                      <p className="text-xs mt-1">Search across tasks, projects, and users</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
