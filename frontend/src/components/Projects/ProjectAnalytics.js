import React from 'react';
import { useQuery } from 'react-query';
import { projectsAPI, tasksAPI } from '../../services/api';
import Card from '../UI/Card';
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
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar,
  Target,
  Zap,
  Award,
  Activity,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Timer,
  AlertCircle,
  LineChart,
  TrendingDown
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ProjectAnalytics = ({ projectId, projectName, analytics: propAnalytics }) => {
  console.log('ProjectAnalytics rendered with:', { projectId, projectName, propAnalytics });
  
  // Use analytics from props if available, otherwise fetch
  const { data: analyticsResp, isLoading, error } = useQuery(
    ['project-analytics', projectId],
    async () => {
      try {
        console.log('Fetching analytics for project:', projectId);
        // Try project-specific analytics first
        const res = await projectsAPI.getProjectAnalytics(projectId);
        console.log('Project analytics response:', res);
        return res.data || res;
      } catch (error) {
        console.error('Project-specific analytics failed, falling back to general analytics:', error);
        // Fallback to general task analytics if project-specific fails
        const res = await tasksAPI.getTaskAnalytics();
        console.log('Fallback analytics response:', res);
        return res.data || res;
      }
    },
    {
      enabled: !propAnalytics, // Only fetch if no analytics prop provided
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );
  
  // Use prop analytics if available, otherwise use fetched data
  const analytics = propAnalytics || (analyticsResp?.data || analyticsResp);
  
  console.log('Analytics data:', analytics);

  if (isLoading && !propAnalytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use fallback data if no analytics data is available
  const displayAnalytics = analytics || {
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    todo_tasks: 0,
    overdue_tasks: 0,
    completion_rate: 0,
    tasks_by_priority: []
  };

  // Handle both project-specific analytics and general analytics
  const isProjectSpecific = displayAnalytics && displayAnalytics.project;
  const displayProjectName = isProjectSpecific ? displayAnalytics.project.name : projectName;
  
  // Calculate completion rate first
  const completionRate = displayAnalytics.total_tasks > 0 
    ? Math.round((displayAnalytics.completed_tasks / displayAnalytics.total_tasks) * 100) 
    : 0;
  
  const stats = [
    {
      title: 'Total Tasks',
      value: displayAnalytics.total_tasks || 0,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
    },
    {
      title: 'Completed Tasks',
      value: displayAnalytics.completed_tasks || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-100 to-green-200',
    },
    {
      title: 'In Progress',
      value: displayAnalytics.in_progress_tasks || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
    },
    {
      title: 'Review',
      value: displayAnalytics.review_tasks || 0,
      icon: AlertCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-100 to-indigo-200',
    },
    {
      title: 'Overdue',
      value: displayAnalytics.overdue_tasks || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-100 to-red-200',
    },
  ];

  const additionalStats = [
    {
      title: 'Avg. Task Duration',
      value: analytics.avg_task_duration ? `${analytics.avg_task_duration} days` : 'N/A',
      icon: Timer,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-100 to-indigo-200',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-100 to-green-200',
    },
    {
      title: 'Quality Rating',
      value: analytics.quality_rating ? `${analytics.quality_rating}/5` : 'N/A',
      icon: Star,
      color: 'text-pink-600',
      bgColor: 'bg-gradient-to-br from-pink-100 to-pink-200',
    },
    {
      title: 'Risk Level',
      value: completionRate < 30 ? 'High' : completionRate < 70 ? 'Medium' : 'Low',
      icon: AlertCircle,
      color: completionRate < 30 ? 'text-red-600' : completionRate < 70 ? 'text-yellow-600' : 'text-green-600',
      bgColor: completionRate < 30 ? 'bg-gradient-to-br from-red-100 to-red-200' : completionRate < 70 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : 'bg-gradient-to-br from-green-100 to-green-200',
    },
  ];

  // Chart data - only from real analytics
  const taskStatusData = [
    { label: 'Completed', value: analytics.completed_tasks || 0, color: '#10B981' },
    { label: 'In Progress', value: analytics.in_progress_tasks || 0, color: '#F59E0B' },
    { label: 'Review', value: analytics.review_tasks || 0, color: '#6366F1' },
    { label: 'To Do', value: (analytics.total_tasks || 0) - (analytics.completed_tasks || 0) - (analytics.in_progress_tasks || 0) - (analytics.review_tasks || 0), color: '#6B7280' },
  ];

  // Only show charts if we have meaningful data
  const hasTaskData = (analytics.total_tasks || 0) > 0;
  const hasTeamData = analytics.team_performance && analytics.team_performance.length > 0;
  
  // Create sample data for demonstration if no real data
  const sampleTaskData = [
    { label: 'Completed', value: 8, color: '#10B981' },
    { label: 'In Progress', value: 3, color: '#F59E0B' },
    { label: 'To Do', value: 4, color: '#6B7280' },
  ];
  
  const displayTaskData = hasTaskData ? taskStatusData : sampleTaskData;

  // Chart data for tasks by status (same as dashboard)
  const statusChartData = {
    labels: ['To Do', 'In Progress', 'Review', 'Done'],
    datasets: [
      {
        data: [
          displayAnalytics.todo_tasks || 0,
          displayAnalytics.in_progress_tasks || 0,
          displayAnalytics.review_tasks || 0,
          displayAnalytics.completed_tasks || 0,
        ],
        backgroundColor: ['#6b7280', '#f59e0b', '#a855f7', '#10b981'],
        borderWidth: 0,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  // Chart data for tasks by priority (same as dashboard)
  const priorityItems = Array.isArray(displayAnalytics?.tasks_by_priority) ? displayAnalytics.tasks_by_priority : [];
  const priorityChartData = {
    labels: priorityItems.map(item => (item.priority || '').toString().charAt(0).toUpperCase() + (item.priority || '').toString().slice(1)),
    datasets: [
      {
        label: 'Tasks',
        data: priorityItems.map(item => item.count || 0),
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
        borderWidth: 0,
      },
    ],
  };

  const priorityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Pie Chart Component
  const PieChartComponent = ({ data, size = 200 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const circumference = 2 * Math.PI * 45; // radius = 45
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
            
            cumulativePercentage += percentage;
            
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r="45"
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: `${index * 200}ms` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
        </div>
      </div>
    );
  };

  // Bar Chart Component for Task Status
  const BarChartComponent = ({ data, title }) => {
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="text-gray-500">{item.value} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                    backgroundColor: item.color,
                    transitionDelay: `${index * 200}ms`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Donut Chart Component (alternative to pie chart)
  const DonutChartComponent = ({ data, size = 200 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="60"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="12"
          />
          {/* Data segments */}
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const circumference = 2 * Math.PI * 60; // radius = 60
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
            
            cumulativePercentage += percentage;
            
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r="60"
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: `${index * 200}ms` }}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-indigo-100">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
        <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Project Analytics</h2>
              {displayProjectName && (
                <p className="text-lg text-gray-600">{displayProjectName}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Comprehensive insights and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Live • Updated {new Date().toLocaleTimeString()}</span>
        </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-0 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-6">
              <div className="flex items-center mb-4">
                <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <stat.icon className={`h-7 w-7 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {additionalStats.map((stat, index) => (
          <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 shadow-md">
            <div className="relative p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} shadow-md`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
                <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section - Same as Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status - Donut Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <div className="h-64">
            <Doughnut data={statusChartData} options={statusChartOptions} />
          </div>
        </Card>

        {/* Tasks by Priority - Bar Chart */}
      <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <div className="h-64">
            <Bar data={priorityChartData} options={priorityChartOptions} />
          </div>
        </Card>
      </div>


      {/* Enhanced Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-8 bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Project Progress</h3>
              <p className="text-sm text-gray-600">Overall completion status</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - completionRate / 100)}`}
                    className="text-blue-600 transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{completionRate}%</span>
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-700">Completion Rate</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-700">Completed</span>
                </div>
                <span className="font-bold text-green-700">{analytics.completed_tasks || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                  <span className="font-medium text-gray-700">Review</span>
                </div>
                <span className="font-bold text-indigo-700">{analytics.review_tasks || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium text-gray-700">In Progress</span>
                </div>
                <span className="font-bold text-yellow-700">{analytics.in_progress_tasks || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                  <span className="font-medium text-gray-700">To Do</span>
                </div>
                <span className="font-bold text-gray-700">{(analytics.total_tasks || 0) - (analytics.completed_tasks || 0) - (analytics.in_progress_tasks || 0) - (analytics.review_tasks || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className="p-8 bg-gradient-to-br from-white to-purple-50 border-0 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
              <p className="text-sm text-gray-600">Key performance indicators</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Completion Rate</p>
                  <p className="text-sm text-gray-500">Overall progress</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-700">
                {completionRate}%
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Timer className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Avg. Task Duration</p>
                  <p className="text-sm text-gray-500">Time to completion</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-indigo-700">
                {analytics.avg_task_duration ? `${analytics.avg_task_duration} days` : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-700">Team Size</p>
                  <p className="text-sm text-gray-500">Active members</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-700">
                {analytics.team_members || 0}
              </span>
            </div>
            {analytics.team_performance && analytics.team_performance.length > 0 && (
              <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Team Member Performance</h4>
                <div className="space-y-2">
                  {analytics.team_performance.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">To Do: {Math.max(0, (member.total_assigned || 0) - (member.completed_tasks || 0) - (member.in_progress_tasks || 0) - (member.review_tasks || 0))}</span>
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">In Prog: {member.in_progress_tasks || 0}</span>
                        <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700">Review: {member.review_tasks || 0}</span>
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700">Done: {member.completed_tasks || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Enhanced Task History */}
      {analytics.recent_completed_tasks && analytics.recent_completed_tasks.length > 0 && (
        <Card className="p-8 bg-gradient-to-br from-white to-green-50 border-0 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recently Completed Tasks</h3>
              <p className="text-sm text-gray-600">Latest achievements and milestones</p>
            </div>
          </div>
          <div className="space-y-4">
            {analytics.recent_completed_tasks.slice(0, 5).map((task, index) => (
              <div key={index} className="group flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200 hover:shadow-lg hover:border-green-300 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-300">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-300">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      Completed by <span className="font-medium text-gray-700">{task.completed_by}</span> • {new Date(task.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.priority && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {task.priority}
                    </span>
                  )}
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enhanced Team Performance */}
      {analytics.team_performance && analytics.team_performance.length > 0 && (
        <Card className="p-8 bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Team Performance</h3>
              <p className="text-sm text-gray-600">Individual contributions and achievements</p>
            </div>
          </div>
          <div className="space-y-4">
            {analytics.team_performance.map((member, index) => (
              <div key={index} className="group flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-700">{member.completed_tasks || 0}</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">tasks</p>
                      <p className="text-xs text-gray-500">completed</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enhanced Project Timeline */}
      <Card className="p-8 bg-gradient-to-br from-white to-indigo-50 border-0 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Project Timeline</h3>
            <p className="text-sm text-gray-600">Key dates and milestones</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Project Started</p>
                <p className="text-sm text-gray-500">Initial launch date</p>
              </div>
            </div>
            <span className="text-lg font-bold text-indigo-700">
              {analytics.project_start_date ? new Date(analytics.project_start_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Last Activity</p>
                <p className="text-sm text-gray-500">Most recent update</p>
              </div>
            </div>
            <span className="text-lg font-bold text-purple-700">
              {analytics.last_activity ? new Date(analytics.last_activity).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Timer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Average Task Duration</p>
                <p className="text-sm text-gray-500">Time to completion</p>
              </div>
            </div>
            <span className="text-lg font-bold text-green-700">
              {analytics.avg_task_duration ? `${analytics.avg_task_duration} days` : 'N/A'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProjectAnalytics;
