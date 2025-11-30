import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { tasksAPI, projectsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ProjectAnalytics from '../../components/Analytics/ProjectAnalytics';
import CompactTimeTracker from '../../components/TimeTracking/CompactTimeTracker';
import MobileMenu from '../../components/Navigation/MobileMenu';
import {
  CheckSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  FolderOpen,
  Settings,
  PieChart,
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { user } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [timeTrackingData, setTimeTrackingData] = useState([]);

  const { data: smProjects, refetch: refetchSMProjects } = useQuery(
    'smProjects',
    projectsAPI.getProjects,
    { 
      enabled: user?.role === 'scrum_master',
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data) => {
        console.log('Scrum Master Projects Data:', data);
      }
    }
  );

  // Employee: fetch assigned projects for dashboard
  const { data: assignedProjectsResp, isLoading: assignedLoading, error: assignedError, refetch: refetchAssignedProjects } = useQuery(
    'assignedProjects',
    projectsAPI.getAssignedProjects,
    { 
      enabled: user?.role === 'employee',
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data) => {
        console.log('Employee Assigned Projects Data:', data);
      }
    }
  );

  const { data: analyticsResp, isLoading, error } = useQuery(
    ['taskAnalytics', user?.role],
    async () => {
      // Dashboard shows general analytics with charts
      const res = await tasksAPI.getTaskAnalytics();
      console.log('Raw analytics response:', res);
      const data = res.data || res;
      console.log('Processed analytics data:', data);
      return data;
    },
    { 
      refetchInterval: 30000, 
      retry: false,
      onSuccess: (data) => {
        console.log('Analytics query success:', data);
      },
      onError: (error) => {
        console.error('Analytics query error:', error);
      }
    }
  );
  const analytics = analyticsResp;

  // Employee project analytics - try project analytics first, fallback to task analytics
  const { data: employeeProjectAnalytics, isLoading: employeeProjectLoading } = useQuery(
    ['employeeProjectAnalytics', selectedProjectId],
    async () => {
      console.log('Employee project analytics - trying project analytics API');
      try {
        const res = await projectsAPI.getProjectAnalytics(selectedProjectId);
        console.log('Employee project analytics response:', res);
        return res.data || res;
      } catch (error) {
        console.log('Employee project analytics failed, falling back to task analytics:', error);
        const taskRes = await tasksAPI.getTaskAnalytics();
        const taskData = taskRes.data || taskRes;
        console.log('Employee task analytics fallback:', taskData);
        return taskData;
      }
    },
    {
      enabled: !!selectedProjectId && showAnalytics && user?.role === 'employee',
      retry: false,
      onSuccess: (data) => {
        console.log('Employee project analytics query success:', data);
      },
      onError: (error) => {
        console.error('Employee project analytics query error:', error);
      }
    }
  );

  // Scrum master project analytics - try project analytics first, fallback to task analytics
  const { data: scrumMasterProjectAnalytics, isLoading: scrumMasterProjectLoading } = useQuery(
    ['scrumMasterProjectAnalytics', selectedProjectId],
    async () => {
      console.log('Scrum master project analytics - trying project analytics API');
      try {
        const res = await projectsAPI.getProjectAnalytics(selectedProjectId);
        console.log('Scrum master project analytics response:', res);
        return res.data || res;
      } catch (error) {
        console.log('Scrum master project analytics failed, falling back to task analytics:', error);
        const taskRes = await tasksAPI.getTaskAnalytics();
        const taskData = taskRes.data || taskRes;
        console.log('Scrum master task analytics fallback:', taskData);
        return taskData;
      }
    },
    {
      enabled: !!selectedProjectId && showAnalytics && user?.role === 'scrum_master',
      retry: false,
      onSuccess: (data) => {
        console.log('Scrum master project analytics query success:', data);
      },
      onError: (error) => {
        console.error('Scrum master project analytics query error:', error);
      }
    }
  );

  // Combine the results based on user role
  const projectSpecificAnalytics = user?.role === 'employee' ? employeeProjectAnalytics : scrumMasterProjectAnalytics;
  const projectAnalyticsLoading = user?.role === 'employee' ? employeeProjectLoading : scrumMasterProjectLoading;

  // Use project-specific analytics only
  const projectAnalytics = projectSpecificAnalytics;
  
  // Debug logging
  console.log('Dashboard state:', {
    selectedProjectId,
    showAnalytics,
    projectAnalytics: projectAnalytics ? 'has data' : 'null',
    projectAnalyticsLoading,
    userRole: user?.role,
    token: localStorage.getItem('token') ? 'exists' : 'missing'
  });

  // Notifications are shown via the header bell; dashboard feed removed per request

  // Removed unused variables

  // Normalize assigned projects for employees
  const assignedProjects = Array.isArray(assignedProjectsResp?.data)
    ? assignedProjectsResp.data
    : (assignedProjectsResp?.data?.results || []);

  if (isLoading || (user?.role === 'employee' && assignedLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  if (user?.role === 'employee' && assignedError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load assigned projects: {assignedError.message}</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Tasks',
      value: analytics?.total_tasks || 0,
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Completed',
      value: analytics?.completed_tasks || 0,
      icon: CheckSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'In Progress',
      value: analytics?.in_progress_tasks || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'Review',
      value: analytics?.review_tasks || 0,
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      name: 'Overdue',
      value: analytics?.overdue_tasks || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  // Chart data for tasks by status with animations
  const statusChartData = {
    labels: ['To Do', 'In Progress', 'Review', 'Done'],
    datasets: [
      {
        data: [
          analytics?.todo_tasks || 0,
          analytics?.in_progress_tasks || 0,
          analytics?.review_tasks || 0,
          analytics?.completed_tasks || 0,
        ],
        backgroundColor: [
          'rgba(107, 114, 128, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgb(107, 114, 128)',
          'rgb(245, 158, 11)',
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(107, 114, 128, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        hoverBorderWidth: 3,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2000,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 5
      }
    }
  };

  // Chart data for tasks by priority with animations
  const priorityItems = Array.isArray(analytics?.tasks_by_priority) ? analytics.tasks_by_priority : [];
  const priorityChartData = {
    labels: priorityItems.map(item => (item.priority || '').toString().charAt(0).toUpperCase() + (item.priority || '').toString().slice(1)),
    datasets: [
      {
        label: 'Tasks',
        data: priorityItems.map(item => item.count || 0),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        hoverBorderWidth: 3,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const priorityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
      delay: (context) => {
        return context.type === 'data' && context.mode === 'default' ? context.dataIndex * 200 : 0;
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} tasks`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
        hoverBorderWidth: 4
      }
    }
  };

  // Project Status Chart Data
  const projectStatusChartData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        label: 'Projects',
        data: [
          user?.role === 'scrum_master' 
            ? (Array.isArray(smProjects?.data) ? smProjects.data.filter(p => p.progress_percentage >= 100).length : (smProjects?.data?.results || []).filter(p => p.progress_percentage >= 100).length)
            : assignedProjects.filter(p => p.progress_percentage >= 100).length,
          user?.role === 'scrum_master' 
            ? (Array.isArray(smProjects?.data) ? smProjects.data.filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length : (smProjects?.data?.results || []).filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length)
            : assignedProjects.filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length,
          user?.role === 'scrum_master' 
            ? (Array.isArray(smProjects?.data) ? smProjects.data.filter(p => p.progress_percentage === 0).length : (smProjects?.data?.results || []).filter(p => p.progress_percentage === 0).length)
            : assignedProjects.filter(p => p.progress_percentage === 0).length
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(107, 114, 128)'
        ],
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(107, 114, 128, 1)'
        ],
        hoverBorderWidth: 5,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const projectStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
      delay: (context) => {
        return context.type === 'data' && context.mode === 'default' ? context.dataIndex * 200 : 0;
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.y} projects`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    },
    elements: {
      bar: {
        borderWidth: 2,
        hoverBorderWidth: 4
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient-blue mb-2">
                Welcome back, {user?.first_name || user?.username}! 👋
              </h1>
              <p className="text-xl text-gray-600">
                Here's what's happening with your tasks today.
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>

          </div>
        </div>
      </div>

      {/* Project selection handled within Projects Overview cards */}

      {/* Scrum Master: All projects quick cards */}
      {user?.role === 'scrum_master' && (
        <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Projects Overview</h3>
                <p className="text-gray-600">
                  Manage and monitor your projects
                  {(() => {
                    const list = Array.isArray(smProjects?.data) ? smProjects.data : (smProjects?.data?.results || []);
                    return list.length > 0 && (
                      <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {list.length} {list.length === 1 ? 'project' : 'projects'}
                      </span>
                    );
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by project:</label>
              <select
                className="border-2 border-blue-200 rounded-xl px-4 py-2 text-sm bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:outline-none transition-all duration-200"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  if (e.target.value) {
                    setShowAnalytics(true);
                  }
                }}
              >
                <option value="">All projects</option>
                {(() => {
                  const list = Array.isArray(smProjects?.data) ? smProjects.data : (smProjects?.data?.results || []);
                  return list.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ));
                })()}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const list = Array.isArray(smProjects?.data) ? smProjects.data : (smProjects?.data?.results || []);
              const displayProjects = list.slice(0, 6); // Show only first 6 projects
              
              if (!list.length) {
                return (
                  <div className="col-span-full text-center text-gray-500 py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg">No projects yet</p>
                    <p className="text-sm text-gray-400 mt-2">Create your first project to get started</p>
                  </div>
                );
              }
              
              return (
                <>
                  {displayProjects.map((p) => (
                    <Card key={p.id} className={`h-full flex flex-col hover-lift transition-all duration-300 ${String(selectedProjectId) === String(p.id) ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-white'}`}> 
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${String(selectedProjectId) === String(p.id) ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
                              <FolderOpen className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-gray-900">{p.name}</h4>
                              {p.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.description}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="primary" className="text-xs flex-shrink-0">
                            {p.task_count || (p.task_stats && p.task_stats.total) || 0} tasks
                          </Badge>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{p.member_count || 0} members</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-700">{p.progress_percentage || 0}% complete</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Progress</span>
                                <span>{p.progress_percentage || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-green-500 transition-all duration-500 ease-out" 
                                  style={{ width: `${p.progress_percentage || 0}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setSelectedProjectId(String(p.id));
                              setShowAnalytics(true);
                            }}
                            className={`w-full text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-200 mt-4 ${
                              String(selectedProjectId) === String(p.id) && showAnalytics
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md'
                            }`}
                          >
                            {String(selectedProjectId) === String(p.id) && showAnalytics ? '✓ Analytics Shown' : 'View Analytics'}
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Show "View All Projects" button if there are more than 6 projects */}
                  {list.length > 6 && (
                    <div className="col-span-full flex justify-center mt-6">
                      <button
                        onClick={() => window.location.href = '/projects'}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                      >
                        <FolderOpen className="h-5 w-5" />
                        View All Projects ({list.length})
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Employee: My Projects section removed per request */}

      {/* Employee: Projects Overview with selector */}
      {user?.role === 'employee' && (
        <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-white to-green-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">My Projects</h3>
                <p className="text-gray-600">
                  View and manage your assigned projects
                  {assignedProjects.length > 0 && (
                    <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      {assignedProjects.length} {assignedProjects.length === 1 ? 'project' : 'projects'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by project:</label>
              <select
                className="border-2 border-green-200 rounded-xl px-4 py-2 text-sm bg-white/80 backdrop-blur-sm focus:border-green-500 focus:outline-none transition-all duration-200"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setShowAnalytics(!!e.target.value);
                }}
              >
                <option value="">All projects</option>
                {assignedProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedProjects.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg">No projects assigned yet</p>
                <p className="text-sm text-gray-400 mt-2">Contact your Scrum Master to be added to a project</p>
              </div>
            ) : (
              assignedProjects.map((p) => (
                <Card key={p.id} className={`h-full flex flex-col hover-lift transition-all duration-300 ${String(selectedProjectId) === String(p.id) ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-white'}`}>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${String(selectedProjectId) === String(p.id) ? 'bg-green-600' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}>
                          <FolderOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900">{p.name}</h4>
                          {p.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="primary" className="text-xs flex-shrink-0">
                        {p.task_count || (p.task_stats && p.task_stats.total) || 0} tasks
                      </Badge>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{p.member_count || 0} members</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">{p.progress_percentage || 0}% complete</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Progress</span>
                            <span>{p.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-3 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 transition-all duration-500 ease-out" 
                              style={{ width: `${p.progress_percentage || 0}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedProjectId(String(p.id));
                          setShowAnalytics(true);
                        }}
                        className={`w-full text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-200 mt-4 ${
                          String(selectedProjectId) === String(p.id) && showAnalytics
                            ? 'bg-green-600 text-white shadow-lg' 
                            : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 hover:shadow-md'
                        }`}
                      >
                        {String(selectedProjectId) === String(p.id) && showAnalytics ? '✓ Analytics Shown' : 'View Analytics'}
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      )}


      {/* Project Analytics Section */}
      {showAnalytics && selectedProjectId && (
        <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-white to-indigo-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Project Analytics</h3>
                <p className="text-gray-600">
                  {(() => {
                    const list = user?.role === 'scrum_master' 
                      ? (Array.isArray(smProjects?.data) ? smProjects.data : (smProjects?.data?.results || []))
                      : assignedProjects;
                    const project = list.find(p => String(p.id) === String(selectedProjectId));
                    return project ? `Detailed insights for ${project.name}` : 'Project analytics';
                  })()}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAnalytics(false);
                setSelectedProjectId('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close Analytics
            </button>
          </div>
          
          <ProjectAnalytics 
            projectId={selectedProjectId}
            projectName={(() => {
              const list = user?.role === 'scrum_master' 
                ? (Array.isArray(smProjects?.data) ? smProjects.data : (smProjects?.data?.results || []))
                : assignedProjects;
              const project = list.find(p => String(p.id) === String(selectedProjectId));
              return project?.name || '';
            })()}
            analytics={projectSpecificAnalytics}
          />
        </Card>
      )}

      {/* Main Dashboard Analytics - Show for all users when no specific project is selected */}
      {!selectedProjectId && (
        <>
          {/* Beautiful Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={stat.name} 
                  className={`p-6 ${stat.bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${stat.bgColor} shadow-lg`}>
                      <Icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </div>
                  {/* Progress indicator */}
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${stat.color.replace('text-', 'bg-')}`}
                      style={{ 
                        width: stat.name === 'Total Tasks' ? '100%' : 
                               stat.name === 'Completed' ? `${analytics?.total_tasks > 0 ? (stat.value / analytics.total_tasks) * 100 : 0}%` :
                               stat.name === 'In Progress' ? `${analytics?.total_tasks > 0 ? (stat.value / analytics.total_tasks) * 100 : 0}%` :
                               stat.name === 'Overdue' ? `${analytics?.total_tasks > 0 ? (stat.value / analytics.total_tasks) * 100 : 0}%` : '0%'
                      }}
                    ></div>
                  </div>
                </Card>
              );
            })}
          </div>


          {/* Beautiful Completion Rate */}
          <Card className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Completion Rate</h3>
                  <p className="text-gray-600">Overall project progress</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-green-600">
                {analytics?.completion_rate || 0}%
            </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 transition-all duration-2000 ease-out shadow-lg"
                style={{ width: `${analytics?.completion_rate || 0}%` }}
              ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </Card>

          {/* Beautiful Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tasks by Status - Enhanced Donut Chart */}
            <Card className="p-8 bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <PieChart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Tasks by Status</h3>
                  <p className="text-sm text-gray-600">Visual breakdown of task progress</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.total_tasks || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
              </div>
              <div className="h-80 relative">
                <Doughnut data={statusChartData} options={statusChartOptions} />
                {/* Center text overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {analytics?.total_tasks || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Tasks</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tasks by Priority - Enhanced Bar Chart */}
            <Card className="p-8 bg-gradient-to-br from-white to-green-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Tasks by Priority</h3>
                  <p className="text-sm text-gray-600">Priority distribution analysis</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    {priorityItems.find(item => item.priority === 'high')?.count || 0}
                  </div>
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
              </div>
              <div className="h-80">
                <Bar data={priorityChartData} options={priorityChartOptions} />
              </div>
            </Card>
          </div>

          {/* Projects Chart Section */}
          <div className="grid grid-cols-1 gap-8">
            {/* Total Projects - Enhanced Bar Chart */}
            <Card className="p-8 bg-gradient-to-br from-white to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <FolderOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Total Projects by Status</h3>
                  <p className="text-sm text-gray-600">Complete project distribution</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {user?.role === 'scrum_master' 
                      ? (Array.isArray(smProjects?.data) ? smProjects.data.length : (smProjects?.data?.results || []).length)
                      : assignedProjects.length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Total Projects</div>
                </div>
              </div>
              <div className="h-80">
                <Bar data={projectStatusChartData} options={projectStatusChartOptions} />
              </div>
            </Card>
          </div>

          {/* Projects Overview */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {user?.role === 'scrum_master' 
                    ? (Array.isArray(smProjects?.data) ? smProjects.data.length : (smProjects?.data?.results || []).length)
                    : assignedProjects.length
                  }
                </div>
                <div className="text-sm text-blue-800">Total Projects</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {user?.role === 'scrum_master' 
                    ? (Array.isArray(smProjects?.data) ? smProjects.data.filter(p => p.progress_percentage >= 100).length : (smProjects?.data?.results || []).filter(p => p.progress_percentage >= 100).length)
                    : assignedProjects.filter(p => p.progress_percentage >= 100).length
                  }
                </div>
                <div className="text-sm text-green-800">Completed Projects</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {user?.role === 'scrum_master' 
                    ? (Array.isArray(smProjects?.data) ? smProjects.data.filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length : (smProjects?.data?.results || []).filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length)
                    : assignedProjects.filter(p => p.progress_percentage > 0 && p.progress_percentage < 100).length
                  }
                </div>
                <div className="text-sm text-yellow-800">In Progress Projects</div>
              </div>
            </div>
          </Card>

          {/* Recent Activities */}
          {analytics?.recent_activities && analytics.recent_activities.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {analytics.recent_activities.slice(0, 10).map((activity, index) => (
                  <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium line-clamp-2">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          by {activity.user_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Enhanced Productivity Insights */}
          <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Productivity Insights</h3>
                  <p className="text-sm text-gray-600">Team performance and task distribution</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-white rounded-xl border border-indigo-100">
                <div className="text-2xl font-bold text-indigo-600 mb-1">
                  {analytics?.avg_task_completion_time || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Avg. Completion Time</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-indigo-100">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {analytics?.tasks_completed_today || 0}
                </div>
                <div className="text-sm text-gray-500">Completed Today</div>
              </div>
              <div className="text-center p-4 bg-white rounded-xl border border-indigo-100">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {analytics?.overdue_tasks || 0}
                </div>
                <div className="text-sm text-gray-500">Overdue Tasks</div>
              </div>
            </div>

            {/* Tasks by Assignee (Scrum Master only) */}
            {user?.role === 'scrum_master' && analytics?.tasks_by_assignee && analytics.tasks_by_assignee.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Team Member Performance</h4>
                <div className="space-y-3">
                  {analytics.tasks_by_assignee.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">
                            {(member.assignee__first_name || 'U').charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {member.assignee__first_name} {member.assignee__last_name}
                          </p>
                          <p className="text-sm text-gray-500">Team Member</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">{member.completed || 0}</div>
                          <div className="text-xs text-gray-500">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-yellow-600">{member.in_progress || 0}</div>
                          <div className="text-xs text-gray-500">In Progress</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-600">{member.total || 0}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Modal Components */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onSearch={() => {}}
        onNotifications={() => {}}
      />
    </div>
  );
};

export default Dashboard;
