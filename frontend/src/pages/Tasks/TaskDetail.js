import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { tasksAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Textarea from '../../components/UI/Textarea';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ConfirmModal from '../../components/UI/ConfirmModal';
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Activity,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch task details
  const { data: task, isLoading, error } = useQuery(
    ['task', id],
    () => tasksAPI.getTask(id),
    {
      onSuccess: (data) => {
        setEditData({
          title: data.data.title,
          description: data.data.description,
          status: data.data.status,
          priority: data.data.priority,
          due_date: data.data.due_date ? new Date(data.data.due_date).toISOString().split('T')[0] : '',
        });
      },
    }
  );

  // Add comment mutation
  const addCommentMutation = useMutation(
    (commentData) => tasksAPI.createTaskComment(id, commentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        setNewComment('');
        toast.success('Comment added successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to add comment');
      },
    }
  );

  // Update task mutation
  const updateTaskMutation = useMutation(
    (taskData) => tasksAPI.updateTask(id, taskData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        setIsEditing(false);
        toast.success('Task updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update task');
      },
    }
  );

  // Delete task mutation
  const deleteTaskMutation = useMutation(
    () => tasksAPI.deleteTask(id),
    {
      onSuccess: () => {
        toast.success('Task deleted successfully');
        navigate('/tasks');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to delete task');
      },
    }
  );

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({ content: newComment });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    updateTaskMutation.mutate(editData);
  };

  const handleDeleteTask = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    deleteTaskMutation.mutate();
    setShowConfirmModal(false);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      todo: 'gray',
      in_progress: 'warning',
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
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
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
        <p className="text-red-500">Failed to load task details</p>
        <Button onClick={() => navigate('/tasks')} className="mt-4">
          Back to Tasks
        </Button>
      </div>
    );
  }

  const taskData = task?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{taskData.title}</h1>
            <p className="text-gray-600">Task Details</p>
          </div>
        </div>
        
        {user?.role === 'scrum_master' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTask}
              loading={deleteTaskMutation.isLoading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card className="p-6">
            <div className="space-y-4">
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <Input
                    label="Title"
                    name="title"
                    value={editData.title}
                    onChange={handleEditChange}
                    required
                  />
                  <Textarea
                    label="Description"
                    name="description"
                    value={editData.description}
                    onChange={handleEditChange}
                    rows={4}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Status"
                      name="status"
                      value={editData.status}
                      onChange={handleEditChange}
                      options={statusOptions}
                    />
                    <Select
                      label="Priority"
                      name="priority"
                      value={editData.priority}
                      onChange={handleEditChange}
                      options={priorityOptions}
                    />
                  </div>
                  <Input
                    label="Due Date"
                    name="due_date"
                    type="date"
                    value={editData.due_date}
                    onChange={handleEditChange}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      loading={updateTaskMutation.isLoading}
                    >
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(taskData.status)}
                    <h2 className="text-xl font-semibold text-gray-900">{taskData.title}</h2>
                    {taskData.is_overdue && (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(taskData.status)}
                    {getPriorityBadge(taskData.priority)}
                  </div>
                  
                  {taskData.description && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{taskData.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Comments */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({taskData.comments?.length || 0})
            </h3>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                type="submit"
                className="mt-2"
                loading={addCommentMutation.isLoading}
                disabled={!newComment.trim()}
              >
                Add Comment
              </Button>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {taskData.comments?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                taskData.comments?.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{comment.author_name}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Assignee:</span>
                <span className="text-sm font-medium">{taskData.assignee_name || 'Unassigned'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Due Date:</span>
                <span className="text-sm font-medium">
                  {taskData.due_date ? format(new Date(taskData.due_date), 'MMM dd, yyyy') : 'No due date'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Project:</span>
                <span className="text-sm font-medium">{taskData.project_name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm font-medium">
                  {format(new Date(taskData.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Created by:</span>
                <span className="text-sm font-medium">{taskData.created_by_name}</span>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </h3>
            <div className="space-y-3">
              {taskData.activities?.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet</p>
              ) : (
                taskData.activities?.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-gray-200 pl-3 py-2">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      by {activity.user_name} • {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Delete Task"
        description={`Are you sure you want to delete "${task?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isSubmitting={deleteTaskMutation.isLoading}
      />
    </div>
  );
};

export default TaskDetail;
