import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { tasksAPI } from '../../services/api';
import Card from '../UI/Card';
import Button from '../UI/Button';
import ConfirmModal from '../UI/ConfirmModal';
import { Plus, Trash2, Users, Calendar, AlertCircle, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

const KanbanBoard = ({ projectId, onTaskCreate }) => {
  const { user } = useAuth();
  const { startTimer, pauseTimer, stopTimer, activeSession, isRunning } = useTimeTracking();
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Fetch tasks for the project
  const { data: tasksResp, isLoading } = useQuery(
    ['project-tasks', projectId],
    () => tasksAPI.getTasks({ project: projectId }),
    {
      enabled: !!projectId,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Delete task mutation
  const deleteTaskMutation = useMutation(
    (taskId) => tasksAPI.deleteTask(taskId),
    {
      onSuccess: () => {
        toast.success('Task completed and removed!');
        queryClient.invalidateQueries(['project-tasks', projectId]);
        queryClient.invalidateQueries('projects');
      },
      onError: (error) => {
        toast.error('Failed to complete task');
        console.error('Delete task error:', error);
      },
    }
  );

  // Update task status mutation
  const updateTaskMutation = useMutation(
    async ({ taskId, status, taskTitle }) => {
      const result = await tasksAPI.updateTask(taskId, { status });
      
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
      }
      
      return result;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-tasks', projectId]);
        queryClient.invalidateQueries('projects');
      },
      onError: (error) => {
        toast.error('Failed to update task status');
        console.error('Update task error:', error);
      },
    }
  );

  // Normalize tasks array from axios response or raw array
  const taskArray = Array.isArray(tasksResp)
    ? tasksResp
    : (Array.isArray(tasksResp?.data)
        ? tasksResp.data
        : (tasksResp?.data?.results || []));

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'review', title: 'Review', color: 'bg-indigo-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' },
  ];

  const getTasksByStatus = (status) => {
    if (!taskArray) return [];
    return taskArray.filter(task => task.status === status);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    if (targetStatus === 'done') {
      // Show confirmation modal for completing task
      setPendingAction({ type: 'complete', task: draggedTask });
      setShowConfirmModal(true);
    } else {
      // Update task status
      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        status: targetStatus,
        taskTitle: draggedTask.title
      });
    }
    
    setDraggedTask(null);
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      if (pendingAction.type === 'complete') {
        deleteTaskMutation.mutate(pendingAction.task.id);
      } else if (pendingAction.type === 'delete') {
        deleteTaskMutation.mutate(pendingAction.task.id);
      }
    }
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Task Board</h2>
        {user?.role === 'scrum_master' && (
          <Button
            onClick={onTaskCreate}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          
          return (
            <div
              key={column.id}
              className={`${column.color} rounded-lg p-4 min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">{column.title}</h3>
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-4 bg-white shadow-sm cursor-move hover:shadow-md transition-shadow"
                    draggable={user?.role === 'scrum_master' || task.assignees?.some(a => a.user === user?.id)}
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          {activeSession && activeSession.task_id === task.id && isRunning && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              Tracking
                            </div>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{task.assignee_count || 0}</span>
                        </div>
                        
                        {task.due_date && (
                          <div className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(task.due_date)}</span>
                            {isOverdue(task.due_date, task.status) && (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>

                      {task.assignees && task.assignees.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.assignees.slice(0, 3).map((assignment) => (
                            <span
                              key={assignment.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {assignment.user_name?.split(' ')[0] || 'Unknown'}
                            </span>
                          ))}
                          {task.assignees.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{task.assignees.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {column.id === 'done' && user?.role === 'scrum_master' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setPendingAction({ type: 'delete', task });
                            setShowConfirmModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-1"
                          loading={deleteTaskMutation.isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove Task
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Moving a task to "Done" may remove it depending on permissions.
          This helps keep the board clean and improves analytics clarity.
        </p>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={pendingAction?.type === 'complete' ? 'Complete Task' : 'Delete Task'}
        description={
          pendingAction?.type === 'complete' 
            ? `Are you sure you want to complete and remove "${pendingAction?.task?.title}"?`
            : `Are you sure you want to delete "${pendingAction?.task?.title}"? This action cannot be undone.`
        }
        confirmText={pendingAction?.type === 'complete' ? 'Complete Task' : 'Delete Task'}
        cancelText="Cancel"
        variant={pendingAction?.type === 'complete' ? 'success' : 'danger'}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        isSubmitting={deleteTaskMutation.isLoading}
      />
    </div>
  );
};

export default KanbanBoard;
