import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tasksAPI, projectsAPI, authAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ConfirmPasswordModal from '../../components/UI/ConfirmPasswordModal';
import TaskModal from '../../components/Tasks/TaskModal';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Tasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignee: '',
    project: '',
  });

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery(
    ['tasks', filters],
    () => tasksAPI.getTasks(filters),
    {
      keepPreviousData: true,
    }
  );

  // Load projects for filter based on user role
  const { data: projects } = useQuery(
    'tasksProjects',
    user?.role === 'scrum_master' ? projectsAPI.getProjects : projectsAPI.getAssignedProjects
  );

  // Fetch employees for filter (Scrum Master only)
  const { data: employees } = useQuery(
    'employees',
    () => authAPI.getEmployees(),
    {
      enabled: user?.role === 'scrum_master',
    }
  );

  // Delete task mutation (after password confirmation)
  const deleteTaskMutation = useMutation((id) => tasksAPI.deleteTask(id), {
    onSuccess: () => {
      setConfirmLoading(false);
      setConfirmDeleteTaskId(null);
      queryClient.invalidateQueries('tasks');
      toast.success('Task deleted successfully');
    },
    onError: (error) => {
      setConfirmLoading(false);
      setConfirmError(error.response?.data?.detail || 'Failed to delete task');
    },
  });

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDeleteTask = (taskId) => {
    setConfirmError('');
    setConfirmDeleteTaskId(taskId);
  };

  const confirmDelete = async (password) => {
    if (!confirmDeleteTaskId) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      // Verify password by attempting login silently
      await authAPI.login(user?.email, password);
      // If login succeeded, proceed to delete
      deleteTaskMutation.mutate(confirmDeleteTaskId);
    } catch (e) {
      setConfirmLoading(false);
      setConfirmError('Incorrect password. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-indigo-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      todo: 'gray',
      in_progress: 'warning',
      review: 'primary',
      done: 'success',
    };
    return (
      <Badge variant={variants[status]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'gray',
      medium: 'primary',
      high: 'warning',
      critical: 'danger',
    };
    return (
      <Badge variant={variants[priority]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  // Normalize data for options
  const employeeList = Array.isArray(employees?.data)
    ? employees.data
    : (employees?.data?.results || []);

  const projectList = Array.isArray(projects?.data)
    ? projects.data
    : (projects?.data?.results || []);

  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    ...employeeList.map(emp => ({
      value: emp.id,
      label: emp.get_full_name || emp.username,
    })),
  ];

  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...projectList.map(project => ({
      value: project.id,
      label: project.name,
    })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 border border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">Tasks</h1>
              <p className="text-xl text-gray-600">Manage and track your tasks efficiently</p>
            </div>
          </div>
          {user?.role === 'scrum_master' && (
            <Button
              onClick={() => {
                setEditingTask(null);
                setShowModal(true);
              }}
              className="flex items-center gap-3 px-6 py-3 h-12 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filter Tasks</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label="Search"
            placeholder="Search by title or description"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="lg:col-span-2"
          />
          <Select
            label="Status"
            placeholder="All Statuses"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={statusOptions}
          />
          <Select
            label="Priority"
            placeholder="All Priorities"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            options={priorityOptions}
          />
          {user?.role === 'scrum_master' && (
            <Select
              label="Assignee"
              placeholder="All Assignees"
              value={filters.assignee}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
              options={assigneeOptions}
            />
          )}
          <Select
            label="Project"
            placeholder="All Projects"
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            options={projectOptions}
            className="bg-white border-blue-200 focus:border-blue-500"
          />
        </div>
        
        {/* Active Filters Display */}
        {(filters.search || filters.status || filters.priority || filters.assignee || filters.project) && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {filters.search && (
                <Badge variant="primary" size="sm" className="bg-blue-100 text-blue-800">
                  Search: {filters.search}
                </Badge>
              )}
              {filters.status && (
                <Badge variant="primary" size="sm" className="bg-green-100 text-green-800">
                  Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="primary" size="sm" className="bg-yellow-100 text-yellow-800">
                  Priority: {priorityOptions.find(opt => opt.value === filters.priority)?.label}
                </Badge>
              )}
              {filters.assignee && (
                <Badge variant="primary" size="sm" className="bg-purple-100 text-purple-800">
                  Assignee: {assigneeOptions.find(opt => opt.value === filters.assignee)?.label}
                </Badge>
              )}
              {filters.project && (
                <Badge variant="primary" size="sm" className="bg-indigo-100 text-indigo-800">
                  Project: {projectOptions.find(opt => opt.value === filters.project)?.label}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ search: '', status: '', priority: '', assignee: '', project: '' })}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tasks Summary */}
      {(() => {
        const taskList = Array.isArray(tasks?.data) ? tasks.data : (tasks?.data?.results || []);
        const projectSummary = taskList.reduce((acc, task) => {
          const projectName = task.project_name || 'No Project';
          if (!acc[projectName]) {
            acc[projectName] = { total: 0, completed: 0, inProgress: 0, review: 0, todo: 0 };
          }
          acc[projectName].total++;
          if (task.status === 'done') acc[projectName].completed++;
          else if (task.status === 'in_progress') acc[projectName].inProgress++;
          else if (task.status === 'review') acc[projectName].review++;
          else acc[projectName].todo++;
          return acc;
        }, {});

        return Object.keys(projectSummary).length > 0 && (
          <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Tasks Summary by Project</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(projectSummary).map(([projectName, stats]) => (
                <div key={projectName} className="bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">{projectName}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-green-600">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Progress:</span>
                      <span className="font-medium text-yellow-600">{stats.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Review:</span>
                      <span className="font-medium text-indigo-600">{stats.review}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To Do:</span>
                      <span className="font-medium text-gray-600">{stats.todo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Tasks List */}
      <div className="space-y-4">
        {(() => {
          // Normalize tasks data (handle both array and paginated responses)
          const taskList = Array.isArray(tasks?.data)
            ? tasks.data
            : (tasks?.data?.results || []);
          
          if (taskList.length === 0) {
            return (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No tasks found</p>
              </Card>
            );
          }
          
          return taskList.map((task) => (
            <Card key={task.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(task.status)}
                    <Link
                      to={`/tasks/${task.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {task.title}
                    </Link>
                    {task.is_overdue && (
                      <Badge variant="danger" size="sm">Overdue</Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {task.assignee_name || 'Unassigned'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No due date'}
                    </div>
                    <span>Project: {task.project_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                  
                  {user?.role === 'scrum_master' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        loading={confirmLoading && confirmDeleteTaskId === task.id}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ));
        })()}
      </div>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingTask(null);
            queryClient.invalidateQueries('tasks');
          }}
        />
      )}

      {/* Confirm Password Modal for Delete */}
      <ConfirmPasswordModal
        isOpen={!!confirmDeleteTaskId}
        title="Confirm Deletion"
        description="Deleting this task is irreversible. Please confirm your password to proceed."
        onCancel={() => {
          setConfirmDeleteTaskId(null);
          setConfirmError('');
        }}
        onConfirm={confirmDelete}
        isSubmitting={confirmLoading}
        errorMessage={confirmError}
      />
    </div>
  );
};

export default Tasks;
