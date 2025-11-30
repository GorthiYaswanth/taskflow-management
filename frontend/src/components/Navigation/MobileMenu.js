import React from 'react';
import { X, Home, CheckSquare, BarChart3, FolderOpen, Users, Settings, Moon, Sun, Search, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const MobileMenu = ({ isOpen, onClose, onSearch, onNotifications }) => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard', color: 'text-blue-600' },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks', color: 'text-green-600' },
    { name: 'Kanban', icon: BarChart3, path: '/kanban', color: 'text-purple-600' },
    { name: 'Projects', icon: FolderOpen, path: '/projects', color: 'text-orange-600' },
    ...(user?.role === 'scrum_master' ? [{ name: 'Users', icon: Users, path: '/users', color: 'text-indigo-600' }] : []),
  ];

  const handleItemClick = (path) => {
    window.location.href = path;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
      <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">TaskFlow</h2>
                <p className="text-xs text-gray-500">{user?.role === 'scrum_master' ? 'Scrum Master' : 'Employee'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSearch}
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Search className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Search</span>
              </button>
              <button
                onClick={onNotifications}
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Notifications</span>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Navigation</h3>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleItemClick(item.path)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <div className={`p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 ${item.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings & Theme */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 rounded-lg bg-gray-100">
                  {isDarkMode ? <Sun className="h-4 w-4 text-yellow-600" /> : <Moon className="h-4 w-4 text-gray-600" />}
                </div>
                <span className="font-medium text-gray-700">
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
              </button>
              
              <button
                onClick={() => handleItemClick('/settings')}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="p-2 rounded-lg bg-gray-100">
                  <Settings className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium text-gray-700">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
