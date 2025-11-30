import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { tasksAPI, projectsAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Select from '../../components/UI/Select';
import TaskModal from '../../components/Tasks/TaskModal';
import ConfirmModal from '../../components/UI/ConfirmModal';
import {
  Plus,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Kanban as KanbanIcon,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Kanban = () => {
  const { user } = useAuth();
  const { startTimer, pauseTimer, stopTimer, activeSession, isRunning } = useTimeTracking();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState(null);

  // Fetch kanban tasks
  const { data: kanbanData, isLoading, error } = useQuery(
    ['kanbanTasks', selectedProjectId],
    () => tasksAPI.getKanbanTasks(selectedProjectId),
    {
      // Refresh frequently so Scrum Master sees employees' updates quickly
      refetchInterval: 5000,
    }
  );

  // Load projects for selector based on user role
  const { data: myProjects } = useQuery(
    'kanbanProjects',
    user?.role === 'scrum_master' ? projectsAPI.getProjects : projectsAPI.getAssignedProjects
  );

  // Update task status mutation
  const updateStatusMutation = useMutation(
    async ({ taskId, status, taskTitle }) => {
      const result = await tasksAPI.updateTaskStatus(taskId, status);
      
      // Handle time tracking based on status change
      if (status === 'in_progress') {
        // Stop any existing timer
        if (activeSession) {
          await stopTimer();
        }
        // Start timer for this task
        try {
          await startTimer(taskId, taskTitle);
          toast.success('Timer started for task');
        } catch (error) {
          console.error('Failed to start timer:', error);
        }
      } else if (status === 'done') {
        // Stop timer if this task is being completed
        if (activeSession && activeSession.task_id === taskId) {
          try {
            await stopTimer();
            toast.success('Timer stopped - task completed');
          } catch (error) {
            console.error('Failed to stop timer:', error);
          }
        }
      } else if (status === 'todo') {
        // Stop timer if task is moved back to todo
        if (activeSession && activeSession.task_id === taskId) {
          try {
            await pauseTimer();
            toast.success('Timer paused - task moved to todo');
          } catch (error) {
            console.error('Failed to pause timer:', error);
          }
        }
      } else if (status === 'review') {
        // Pause timer when moving to review
        if (activeSession && activeSession.task_id === taskId) {
          try {
            await pauseTimer();
            toast.success('Timer paused - task moved to review');
          } catch (error) {
            console.error('Failed to pause timer:', error);
          }
        }
      }
      
      return result;
    },
    {
      // Optimistic update for instant UI feedback
      onMutate: async ({ taskId, status }) => {
        await queryClient.cancelQueries('kanbanTasks');
        const previous = queryClient.getQueryData('kanbanTasks');
        if (previous) {
          // Handle both direct data and axios response format
          const data = previous.data || previous;
          const clone = {
            data: {
              todo: [...(data.todo || [])],
              in_progress: [...(data.in_progress || [])],
              review: [...(data.review || [])],
              done: [...(data.done || [])],
            }
          };
          // Remove task from any column
          let task;
          for (const col of ['todo', 'in_progress', 'review', 'done']) {
            const idx = clone.data[col].findIndex((t) => t.id === taskId);
            if (idx !== -1) {
              task = { ...clone.data[col][idx] };
              clone.data[col].splice(idx, 1);
              break;
            }
          }
          // Insert into new column
          if (task) {
            task.status = status;
            clone.data[status].unshift(task);
            queryClient.setQueryData('kanbanTasks', clone);
          }
        }
        return { previous };
      },
      onError: (error, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData('kanbanTasks', context.previous);
        }
        const serverMsg = error?.response?.data?.detail || error?.response?.data?.error;
        toast.error(serverMsg || 'Failed to update task status');
      },
      onSettled: () => {
        queryClient.invalidateQueries('kanbanTasks');
      },
    }
  );

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Check permissions
    if (user?.role === 'employee' && draggedTask.assignee !== user.id) {
      toast.error('You can only update your assigned tasks');
      setDraggedTask(null);
      return;
    }

    // If moving to "done", show confirmation modal
    if (newStatus === 'done') {
      setPendingTaskUpdate({ taskId: draggedTask.id, status: newStatus, task: draggedTask });
      setShowConfirmModal(true);
      setDraggedTask(null);
      return;
    }

    // For other status changes, proceed directly
    updateStatusMutation.mutate({
      taskId: draggedTask.id,
      status: newStatus,
      taskTitle: draggedTask.title,
    });

    setDraggedTask(null);
  };

  const handleConfirmTaskCompletion = () => {
    if (pendingTaskUpdate) {
      updateStatusMutation.mutate({
        taskId: pendingTaskUpdate.taskId,
        status: pendingTaskUpdate.status,
        taskTitle: pendingTaskUpdate.task?.title,
      });
    }
    setShowConfirmModal(false);
    setPendingTaskUpdate(null);
  };

  const handleCancelTaskCompletion = () => {
    setShowConfirmModal(false);
    setPendingTaskUpdate(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'gray',
      medium: 'primary',
      high: 'warning',
      critical: 'danger',
    };
    return (
      <Badge variant={variants[priority]} size="sm">
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Normalize axios response: extract .data which contains { todo, in_progress, review, done }
  const data = kanbanData?.data || {};

  const columns = [
    {
      id: 'todo',
      title: 'To Do',
      color: 'bg-gradient-to-br from-gray-50 to-gray-100',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      tasks: data?.todo || [],
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      tasks: data?.in_progress || [],
    },
    {
      id: 'review',
      title: 'Review',
      color: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-700',
      tasks: data?.review || [],
    },
    {
      id: 'done',
      title: 'Done',
      color: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      tasks: data?.done || [],
    },
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
        <p className="text-red-500">Failed to load kanban board</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-8 border border-orange-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl shadow-lg">
              <KanbanIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">Kanban Board</h1>
              <p className="text-xl text-gray-600">Drag and drop tasks to update their status</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-600" />
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                options={(() => {
                  const list = Array.isArray(myProjects?.data) ? myProjects.data : (myProjects?.data?.results || []);
                  return [{ value: '', label: 'All Projects' }, ...list.map(p => ({ value: p.id, label: p.name }))];
                })()}
                placeholder="Filter by project"
                className="min-w-[200px] bg-white border-orange-200 focus:border-orange-500"
              />
            </div>
            <a
              href="/tasks"
              className="btn btn-primary flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium"
            >
              <Plus className="h-4 w-4" />
              Go to Tasks
            </a>
          </div>
        </div>
      </div>

      {/* Project Filter Status */}
      {selectedProjectId && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Filter className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Filtering by project:</p>
                <p className="text-lg font-semibold text-orange-800">
                  {(() => {
                    const list = Array.isArray(myProjects?.data) ? myProjects.data : (myProjects?.data?.results || []);
                    const project = list.find(p => p.id === selectedProjectId);
                    return project?.name || 'Unknown Project';
                  })()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProjectId('')}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`p-4 rounded-xl ${column.color} border ${column.borderColor} shadow-sm mb-4`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${column.textColor}`}>{column.title}</h3>
                <span className="bg-white bg-opacity-70 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                  {column.tasks.length}
                </span>
              </div>
            </div>

            {/* Tasks Container - Fixed Height */}
            <div
              className={`flex-1 min-h-[600px] max-h-[600px] overflow-y-auto transition-all duration-300 rounded-xl p-2 ${
                dragOverColumn === column.id && draggedTask && draggedTask.status !== column.id
                  ? 'bg-blue-50 border-2 border-blue-300 border-dashed shadow-inner'
                  : 'hover:bg-gray-50/50'
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  className={`h-[200px] w-full p-4 cursor-move hover:shadow-lg transition-all duration-200 rounded-xl border border-gray-100 bg-white mb-3 ${
                    draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (user?.role === 'scrum_master') {
                      handleEditTask(task);
                    }
                  }}
                >
                  <div className="h-full flex flex-col">
                    {/* Task Header - Fixed Height */}
                    <div className="flex items-start justify-between mb-3 h-[3rem]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getStatusIcon(task.status)}
                        <h4 className="font-semibold text-gray-900 line-clamp-2 leading-5">
                          {task.title}
                        </h4>
                        {activeSession && activeSession.task_id === task.id && isRunning && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Tracking
                          </div>
                        )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>

                    {/* Task Description - Fixed Height */}
                    <div className="mb-3 h-[3rem]">
                      <p className="text-sm text-gray-600 line-clamp-2 h-full">
                        {task.description || 'No description provided'}
                      </p>
                    </div>

                    {/* Task Meta - Fixed Height */}
                    <div className="space-y-2 text-xs text-gray-500 mb-3 h-[4rem]">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">{task.assignee_name || 'Unassigned'}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No due date'}
                        </span>
                        {task.is_overdue && (
                          <Badge variant="danger" size="sm" className="ml-1">Overdue</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-medium">Project:</span>
                        <span className="truncate">{task.project_name}</span>
                      </div>
                    </div>

                    {/* Comments Count - Fixed at Bottom */}
                    <div className="mt-auto">
                      {task.comments_count > 0 && (
                        <div className="text-xs text-blue-600 font-medium">
                          💬 {task.comments_count} comment{task.comments_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {/* Empty State - Same height as task cards */}
              {column.tasks.length === 0 && (
                <div className="h-[200px] w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/30">
                  <div className="text-gray-400 mb-2">
                    {column.id === 'todo' && <AlertCircle className="h-8 w-8" />}
                    {column.id === 'in_progress' && <Clock className="h-8 w-8" />}
                    {column.id === 'review' && <AlertCircle className="h-8 w-8" />}
                    {column.id === 'done' && <CheckCircle className="h-8 w-8" />}
                  </div>
                  <p className="text-gray-500 text-sm font-medium">No tasks</p>
                  <p className="text-gray-400 text-xs">Drop tasks here</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
            queryClient.invalidateQueries('kanbanTasks');
          }}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Complete Task"
        description={`Are you sure you want to complete and move "${pendingTaskUpdate?.task?.title}" to Done? This action will mark the task as completed.`}
        confirmText="Complete Task"
        cancelText="Cancel"
        variant="success"
        onConfirm={handleConfirmTaskCompletion}
        onCancel={handleCancelTaskCompletion}
        isSubmitting={updateStatusMutation.isLoading}
      />
    </div>
  );
};

export default Kanban;
