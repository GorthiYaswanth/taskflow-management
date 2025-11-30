import React, { useState, useEffect } from 'react';
import { Search, X, FileText, Users, FolderOpen, Clock, CheckCircle } from 'lucide-react';
import Card from '../UI/Card';
import { tasksAPI, projectsAPI, authAPI } from '../../services/api';

const GlobalSearch = ({ isOpen, onClose, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Real API search function
  const performSearch = async (query) => {
    if (!query.trim() || query.length <= 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
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
              project: task.project_name,
              icon: CheckCircle,
              color: 'text-blue-600'
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
              progress: project.progress_percentage,
              icon: FolderOpen,
              color: 'text-green-600'
            });
          }
        });
      }

      // Process employees
      if (employeesRes.status === 'fulfilled' && employeesRes.value?.data) {
        const employees = Array.isArray(employeesRes.value.data) ? employeesRes.value.data : employeesRes.value.data.results || [];
        employees.forEach(employee => {
          if (employee.first_name?.toLowerCase().includes(query.toLowerCase()) || 
              employee.last_name?.toLowerCase().includes(query.toLowerCase()) ||
              employee.email?.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type: 'user',
              id: employee.id,
              title: `${employee.first_name} ${employee.last_name}`,
              description: employee.role || 'Team Member',
              email: employee.email,
              icon: Users,
              color: 'text-purple-600'
            });
          }
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleResultClick = (result) => {
    onSearch(result);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 bg-white shadow-2xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks, projects, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-gray-100 ${result.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                          result.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{result.description}</p>
                      {result.project && (
                        <p className="text-xs text-gray-400">Project: {result.project}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery.length > 2 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Start typing to search...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GlobalSearch;
