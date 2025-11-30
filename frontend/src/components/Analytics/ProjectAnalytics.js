import React from 'react';
import { useQuery } from 'react-query';
import { projectsAPI, tasksAPI } from '../../services/api';
import Card from '../UI/Card';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
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
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
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
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-indigo-200',
    },
    {
      title: 'Completed',
      value: displayAnalytics.completed_tasks || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-100 via-green-100 to-emerald-200',
    },
    {
      title: 'In Progress',
      value: displayAnalytics.in_progress_tasks || 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200',
    },
    {
      title: 'Review',
      value: displayAnalytics.review_tasks || 0,
      icon: AlertCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-indigo-200',
    },
    {
      title: 'Overdue',
      value: displayAnalytics.overdue_tasks || 0,
      icon: AlertCircle,
      color: 'text-rose-600',
      bgColor: 'bg-gradient-to-br from-rose-100 via-red-100 to-rose-200',
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

  // Chart data for tasks by status with beautiful colors
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
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(245, 158, 11)',
          'rgb(168, 85, 247)',
          'rgb(16, 185, 129)'
        ],
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        hoverBorderWidth: 5,
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

  // Chart data for tasks by priority with beautiful colors
  const priorityItems = Array.isArray(displayAnalytics?.tasks_by_priority) ? displayAnalytics.tasks_by_priority : [];
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
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        hoverBorderWidth: 5,
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

  // Line Chart Data for Task Trends - include Review
  const taskTrendData = {
    labels: ['To Do', 'In Progress', 'Review', 'Completed'],
    datasets: [
      {
        label: 'Task Status',
        data: [
          displayAnalytics.todo_tasks || 0,
          displayAnalytics.in_progress_tasks || 0,
          displayAnalytics.review_tasks || 0,
          displayAnalytics.completed_tasks || 0
        ],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const taskTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
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
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
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
      line: {
        borderWidth: 3
      },
      point: {
        hoverBorderWidth: 3
      }
    }
  };

  // Radar Chart Data for Team Performance - include Review
  const teamPerformanceData = {
    labels: ['Total Tasks', 'Completed', 'In Progress', 'Review', 'Overdue', 'Todo', 'Completion Rate'],
    datasets: [
      {
        label: 'Project Metrics',
        data: [
          displayAnalytics.total_tasks || 0,
          displayAnalytics.completed_tasks || 0,
          displayAnalytics.in_progress_tasks || 0,
          displayAnalytics.review_tasks || 0,
          displayAnalytics.overdue_tasks || 0,
          displayAnalytics.todo_tasks || 0,
          completionRate
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const teamPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
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
        displayColors: true
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: Math.max(displayAnalytics.total_tasks || 0, 10),
        ticks: {
          stepSize: Math.ceil((displayAnalytics.total_tasks || 0) / 5),
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 3
      },
      point: {
        hoverBorderWidth: 3
      }
    }
  };

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl shadow-inner">
      {/* Beautiful Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl animate-pulse">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{displayProjectName} Analytics</h1>
        <p className="text-gray-600">Project-specific insights and performance metrics</p>
      </div>

      {/* Beautiful Key Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`p-6 ${stat.bgColor} border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 cursor-pointer`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
          <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1 transition-all duration-300">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.color} transition-all duration-300`}>{stat.value}</p>
              </div>
                <div className={`p-4 rounded-xl ${stat.bgColor} shadow-lg transition-all duration-300 transform hover:rotate-12 hover:scale-110`}>
                  <Icon className={`h-8 w-8 ${stat.color} transition-all duration-300`} />
              </div>
            </div>
              {/* Progress indicator */}
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${stat.color.replace('text-', 'bg-')}`}
                  style={{ 
                    width: stat.title === 'Total Tasks' ? '100%' : 
                           stat.title === 'Completed' ? `${displayAnalytics.total_tasks > 0 ? (stat.value / displayAnalytics.total_tasks) * 100 : 0}%` :
                           stat.title === 'In Progress' ? `${displayAnalytics.total_tasks > 0 ? (stat.value / displayAnalytics.total_tasks) * 100 : 0}%` :
                           stat.title === 'Overdue' ? `${displayAnalytics.total_tasks > 0 ? (stat.value / displayAnalytics.total_tasks) * 100 : 0}%` : '0%'
                  }}
                ></div>
              </div>
              {/* Percentage display */}
              <div className="mt-2 text-right">
                <span className={`text-sm font-bold ${stat.color}`}>
                  {stat.title === 'Total Tasks' ? '100%' : 
                   stat.title === 'Completed' ? `${displayAnalytics.total_tasks > 0 ? Math.round((stat.value / displayAnalytics.total_tasks) * 100) : 0}%` :
                   stat.title === 'In Progress' ? `${displayAnalytics.total_tasks > 0 ? Math.round((stat.value / displayAnalytics.total_tasks) * 100) : 0}%` :
                   stat.title === 'Overdue' ? `${displayAnalytics.total_tasks > 0 ? Math.round((stat.value / displayAnalytics.total_tasks) * 100) : 0}%` : '0%'}
                </span>
          </div>
        </Card>
          );
        })}
      </div>

      {/* All Charts Section - Moved Up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks by Status - Enhanced Donut Chart */}
        <Card className="p-8 bg-gradient-to-br from-white to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
              <PieChart className="h-6 w-6 text-white" />
              </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Task Status Distribution</h3>
              <p className="text-sm text-gray-600">Visual breakdown of task progress</p>
              </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-blue-600">
                {displayAnalytics.total_tasks || 0}
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
                  {displayAnalytics.total_tasks || 0}
          </div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tasks by Priority - Enhanced Bar Chart */}
        <Card className="p-8 bg-gradient-to-br from-white to-green-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
              </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Priority Distribution</h3>
              <p className="text-sm text-gray-600">Task priority breakdown</p>
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

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Trends - Line Chart */}
        <Card className="p-8 bg-gradient-to-br from-white to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <LineChart className="h-6 w-6 text-white" />
              </div>
              <div>
              <h3 className="text-xl font-bold text-gray-900">Task Trends</h3>
              <p className="text-sm text-gray-600">Progress over time</p>
              </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-purple-600">
                +{taskTrendData.datasets[0].data[taskTrendData.datasets[0].data.length - 1] - taskTrendData.datasets[0].data[0]}
            </div>
              <div className="text-sm text-gray-600">Tasks Growth</div>
            </div>
          </div>
          <div className="h-80">
            <Line data={taskTrendData} options={taskTrendOptions} />
          </div>
        </Card>

        {/* Team Performance - Radar Chart */}
        <Card className="p-8 bg-gradient-to-br from-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
              </div>
              <div>
              <h3 className="text-xl font-bold text-gray-900">Team Performance</h3>
              <p className="text-sm text-gray-600">Multi-dimensional analysis</p>
              </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold text-indigo-600">
                {Math.round(teamPerformanceData.datasets[0].data.reduce((a, b) => a + b, 0) / teamPerformanceData.datasets[0].data.length)}%
            </div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>
          </div>
          <div className="h-80">
            <Radar data={teamPerformanceData} options={teamPerformanceOptions} />
          </div>
        </Card>
      </div>

      {/* Project Summary Section - Using Only Original Data */}
      <Card className="p-8 bg-gradient-to-br from-white to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
            <h3 className="text-xl font-bold text-gray-900">Project Summary</h3>
            <p className="text-sm text-gray-600">Complete project data overview</p>
              </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-orange-600">
              {displayAnalytics.total_tasks || 0}
            </div>
            <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {displayAnalytics.completed_tasks || 0}
          </div>
              <div className="text-sm text-gray-600">Completed Tasks</div>
              <div className="mt-2 text-xs text-gray-500">
                {completionRate}% of total
              </div>
          </div>
        </Card>

          <Card className="p-6 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {displayAnalytics.in_progress_tasks || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
              <div className="mt-2 text-xs text-gray-500">
                Active work
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">
                {displayAnalytics.todo_tasks || 0}
              </div>
              <div className="text-sm text-gray-600">To Do</div>
              <div className="mt-2 text-xs text-gray-500">
                Pending tasks
            </div>
          </div>
        </Card>

          <Card className="p-6 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {displayAnalytics.overdue_tasks || 0}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="mt-2 text-xs text-gray-500">
                Needs attention
              </div>
            </div>
          </Card>
              </div>
        </Card>


      {/* Progress Overview */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
            <h3 className="text-xl font-bold text-gray-900">Progress Overview</h3>
            <p className="text-gray-600">Project completion and milestone tracking</p>
              </div>
            </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{completionRate}%</div>
            <div className="text-sm text-gray-600">Overall Completion</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{displayAnalytics.total_tasks || 0}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{analytics.team_members || 0}</div>
            <div className="text-sm text-gray-600">Team Members</div>
      </div>
          </div>
        </Card>

      {/* Performance Metrics */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-0 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
              <div>
            <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
            <p className="text-gray-600">Key performance indicators and team efficiency</p>
              </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-white rounded-lg shadow-md">
            <div className="text-2xl font-bold text-green-600 mb-1">{displayAnalytics.completed_tasks || 0}</div>
            <div className="text-sm text-gray-600">Completed Tasks</div>
                </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-md">
            <div className="text-2xl font-bold text-yellow-600 mb-1">{displayAnalytics.in_progress_tasks || 0}</div>
            <div className="text-sm text-gray-600">In Progress</div>
                </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-md">
            <div className="text-2xl font-bold text-gray-600 mb-1">{displayAnalytics.todo_tasks || 0}</div>
            <div className="text-sm text-gray-600">To Do</div>
              </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-md">
            <div className="text-2xl font-bold text-red-600 mb-1">{displayAnalytics.overdue_tasks || 0}</div>
            <div className="text-sm text-gray-600">Overdue</div>
                </div>
              </div>
        </Card>

      {/* Task History */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-0 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl shadow-lg">
            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
            <h3 className="text-xl font-bold text-gray-900">Task History</h3>
            <p className="text-gray-600">Recent task activity and completion trends</p>
                        </div>
                      </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Tasks completed this week</span>
                          </div>
            <span className="text-lg font-bold text-green-600">{displayAnalytics.completed_tasks || 0}</span>
                          </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Tasks in progress</span>
                          </div>
            <span className="text-lg font-bold text-yellow-600">{displayAnalytics.in_progress_tasks || 0}</span>
                        </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium">Overdue tasks</span>
                        </div>
            <span className="text-lg font-bold text-red-600">{displayAnalytics.overdue_tasks || 0}</span>
                      </div>
                    </div>
        </Card>

      {/* Team Performance */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border-0 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
            <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
            <h3 className="text-xl font-bold text-gray-900">Team Performance</h3>
            <p className="text-gray-600">Individual and team productivity metrics</p>
                      </div>
                    </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl font-bold text-blue-600 mb-2">{analytics.team_members || 0}</div>
            <div className="text-sm text-gray-600">Active Team Members</div>
                      </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-3xl font-bold text-green-600 mb-2">{completionRate}%</div>
            <div className="text-sm text-gray-600">Team Efficiency</div>
                      </div>
                    </div>
        </Card>

      {/* Project Timeline */}
      <Card className="p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-0 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
                  </div>
              <div>
            <h3 className="text-xl font-bold text-gray-900">Project Timeline</h3>
            <p className="text-gray-600">Project milestones and deadline tracking</p>
                </div>
            </div>

            <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Project Start Date</span>
                </div>
            <span className="text-sm text-gray-600">Recently Started</span>
              </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <span className="font-medium">Expected Completion</span>
              </div>
            <span className="text-sm text-gray-600">On Track</span>
                </div>
              </div>
        </Card>

      


      {/* Progress Overview Section */}
      <Card className="p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 cursor-pointer">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
                </div>
                    <div>
            <h3 className="text-xl font-bold text-gray-900">Project Progress Overview</h3>
            <p className="text-sm text-gray-600">Comprehensive project status</p>
                    </div>
                    </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              {completionRate}%
                  </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-2000 ease-out"
                style={{ width: `${completionRate}%` }}
                        ></div>
              </div>
                      </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {displayAnalytics.total_tasks || 0}
                </div>
            <div className="text-sm text-gray-600">Total Tasks</div>
            <div className="mt-4 text-xs text-gray-500">
              {displayAnalytics.completed_tasks || 0} completed, {displayAnalytics.in_progress_tasks || 0} in progress
              </div>
                </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {displayAnalytics.overdue_tasks || 0}
                </div>
            <div className="text-sm text-gray-600">Overdue Tasks</div>
            <div className="mt-4 text-xs text-gray-500">
              {displayAnalytics.overdue_tasks > 0 ? 'Needs attention' : 'All on track'}
              </div>
                </div>
              </div>
            </Card>
    </div>
  );
};

export default ProjectAnalytics;
