import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { projectsAPI, authAPI, tasksAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Textarea from '../../components/UI/Textarea';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ConfirmPasswordModal from '../../components/UI/ConfirmPasswordModal';
import ProjectMembersModal from '../../components/Projects/ProjectMembersModal';
import ProjectChat from '../../components/Projects/ProjectChat';
import KanbanBoard from '../../components/Tasks/KanbanBoard';
import TaskModal from '../../components/Tasks/TaskModal';
import ProjectAnalytics from '../../components/Projects/ProjectAnalytics';
import {
  Plus,
  FolderOpen,
  Calendar,
  User,
  BarChart3,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  MessageSquare,
  Send,
  UserPlus,
  X,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Projects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedProjectForAnalytics, setSelectedProjectForAnalytics] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedProjectForChat, setSelectedProjectForChat] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    member_ids: [],
  });

  // Fetch projects - different API based on user role
  const { data: projects, isLoading, error, refetch } = useQuery(
    'projects',
    user?.role === 'employee' ? projectsAPI.getAssignedProjects : projectsAPI.getProjects,
    {
      refetchInterval: 30000, // Refetch every 30 seconds to ensure fresh data
      onError: (error) => {
        console.error('Error fetching projects:', error);
      },
      onSuccess: (data) => {
        console.log('=== PROJECTS LIST DEBUG ===');
        console.log('User role:', user?.role);
        console.log('Projects data:', data);
        
        // Normalize paginated/non-paginated responses (same logic as used in render)
        const allProjects = Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) 
              ? data.data 
              : (data?.data?.results || []));
        
        if (Array.isArray(allProjects)) {
          allProjects.forEach(project => {
            console.log(`Project: ${project.name}`);
            console.log(`  - Task count: ${project.task_count}`);
            console.log(`  - Task stats:`, project.task_stats);
            console.log(`  - Member count: ${project.member_count}`);
            console.log(`  - Progress: ${project.progress_percentage}%`);
          });
        }
        console.log('==========================');
      }
    }
  );

  // Fetch project messages when a project is selected
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery(
    ['projectMessages', selectedProject?.id],
    () => projectsAPI.getProjectMessages(selectedProject.id),
    {
      enabled: !!selectedProject && showMessages,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    }
  );


  // Create/Update project mutation
  const projectMutation = useMutation(
    (data) => editingProject ? projectsAPI.updateProject(editingProject.id, data) : projectsAPI.createProject(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        setShowModal(false);
        setEditingProject(null);
        setFormData({ name: '', description: '', member_ids: [] });
        toast.success(editingProject ? 'Project updated successfully' : 'Project created successfully');
      },
      onError: (error) => {
        const data = error.response?.data;
        let message = 'Operation failed';
        if (typeof data === 'string') {
          message = data;
        } else if (data?.detail) {
          message = data.detail;
        } else if (data && typeof data === 'object') {
          const first = Object.entries(data)[0];
          if (first) {
            const [, msgs] = first;
            message = Array.isArray(msgs) ? msgs[0] : String(msgs);
          }
        }
        toast.error(message);
      },
    }
  );

  // Delete project mutation
  const deleteProjectMutation = useMutation(
    (projectId) => projectsAPI.deleteProject(projectId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast.success('Project deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to delete project');
      },
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    (messageData) => projectsAPI.createProjectMessage(selectedProject.id, messageData),
    {
      onSuccess: () => {
        setNewMessage('');
        refetchMessages();
        toast.success('Message sent');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to send message');
      },
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    const payload = {
      name: formData.name.trim(),
      description: (formData.description || '').trim(),
      member_ids: formData.member_ids,
    };
    projectMutation.mutate(payload);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      member_ids: [],
    });
    setShowModal(true);
  };

  const handleDeleteProject = (projectId) => {
    setConfirmError('');
    setConfirmDeleteProjectId(projectId);
  };

  const confirmDelete = async (password) => {
    if (!confirmDeleteProjectId) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      // verify identity using password
      await authAPI.login(user?.email, password);
      deleteProjectMutation.mutate(confirmDeleteProjectId, {
        onSettled: () => {
          setConfirmLoading(false);
          setConfirmDeleteProjectId(null);
        }
      });
    } catch (e) {
      setConfirmLoading(false);
      setConfirmError('Incorrect password. Please try again.');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      content: newMessage.trim(),
    });
  };

  const handleOpenMessages = (project) => {
    console.log('Opening chat for project:', project);
    setSelectedProject(project);
    setSelectedProjectForChat(project.id);
    setShowChat(true);
  };

  const handleCloseMessages = () => {
    setShowMessages(false);
    setSelectedProject(null);
    setNewMessage('');
  };

  const handleOpenMembers = (project) => {
    setSelectedProject(project);
    setShowMembers(true);
  };

  const handleCloseMembers = () => {
    setShowMembers(false);
    setSelectedProject(null);
  };

  const handleOpenKanban = (project) => {
    setSelectedProject(project);
    setShowKanban(true);
  };

  const handleCloseKanban = () => {
    setShowKanban(false);
    setSelectedProject(null);
  };

  const handleOpenAnalytics = (project) => {
    console.log('Opening analytics for project:', project);
    setSelectedProject(project);
    setSelectedProjectForAnalytics(project.id);
    setShowAnalytics(true);
  };

  const handleCloseAnalytics = () => {
    setShowAnalytics(false);
    setSelectedProjectForAnalytics('');
  };

  const handleOpenChat = (project) => {
    console.log('Opening chat for project:', project);
    setSelectedProject(project);
    setSelectedProjectForChat(project.id);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedProjectForChat('');
  };

  const handleViewAnalytics = (projectId = '') => {
    setSelectedProjectForAnalytics(projectId);
    setShowAnalytics(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleTaskSuccess = () => {
    queryClient.invalidateQueries('projects');
    handleCloseTaskModal();
  };

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
        <p className="text-red-500">Failed to load projects</p>
      </div>
    );
  }

  // Normalize paginated/non-paginated responses
  const allProjects = Array.isArray(projects)
    ? projects
    : (Array.isArray(projects?.data) 
        ? projects.data 
        : (projects?.data?.results || []));

  // Filter projects based on search query
  const projectList = allProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug logging
  console.log('Projects response:', projects);
  console.log('Project list:', projectList);
  console.log('Project list length:', projectList.length);

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <FolderOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>
                <p className="text-lg text-gray-600">
                  Manage your projects and track progress
                  {projectList.length > 0 && (
                    <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {projectList.length} {projectList.length === 1 ? 'project' : 'projects'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Enhanced Search Bar */}
            <div className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
              <Input
                type="text"
                placeholder="Search projects by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white/90 backdrop-blur-sm border-2 border-blue-200 focus:border-blue-500 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 h-10 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <TrendingUp className="h-4 w-4" />
              Refresh
            </Button>
            
            {user?.role === 'scrum_master' && (
              <Button
                onClick={() => {
                  setEditingProject(null);
                  setFormData({ name: '', description: '' });
                  setShowModal(true);
                }}
                className="flex items-center gap-3 px-6 py-3 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectList.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {user?.role === 'employee' 
                  ? 'No projects assigned to you yet. Contact your Scrum Master to be added to a project.'
                  : 'No projects found'
                }
              </p>
              {user?.role === 'scrum_master' && (
                <Button
                  onClick={() => setShowModal(true)}
                  className="mt-4"
                >
                  Create your first project
                </Button>
              )}
            </Card>
          </div>
        ) : (
          projectList.map((project) => (
            <Card key={project.id} className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 rounded-2xl border border-gray-200 h-full">
              <div className="flex h-full flex-col">
                {/* Project Header with Gradient Background */}
                <div className="relative p-6 pb-4">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-xl leading-6 truncate group-hover:text-blue-700 transition-colors duration-300">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="primary" size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md">
                            {project.task_count || (project.task_stats && project.task_stats.total) || 0} tasks
                          </Badge>
                          <Badge 
                            variant={project.progress_percentage === 100 ? "success" : project.progress_percentage > 50 ? "warning" : "secondary"}
                            size="sm"
                            className="shadow-md"
                          >
                            {project.progress_percentage}% complete
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {user?.role === 'scrum_master' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Description */}
                {project.description && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                )}

                {/* Project Meta with Enhanced Design */}
                <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Creator and Date */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="p-1 bg-gray-100 rounded-lg">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="font-medium">Created by {project.created_by_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="p-1 bg-gray-100 rounded-lg">
                          <Calendar className="h-3 w-3" />
                        </div>
                        <span className="font-medium">{format(new Date(project.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{project.member_count}</div>
                          <div className="text-xs text-gray-500">Members</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{project.progress_percentage}%</div>
                          <div className="text-xs text-gray-500">Complete</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Project Progress</span>
                        <span className="font-bold text-gray-900">{project.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                            project.progress_percentage === 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : project.progress_percentage > 50 
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                          style={{ width: `${project.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Task Status Summary (includes Review) */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(() => {
                        const stats = project.task_stats || {};
                        const todo = stats.todo || 0;
                        const inProg = stats.in_progress || 0;
                        const review = stats.review || 0;
                        const done = stats.done || stats.completed || 0;
                        return (
                          <>
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
                              <span className="text-xs text-gray-600">To Do</span>
                              <span className="text-xs font-semibold text-gray-700">{todo}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-yellow-100">
                              <span className="text-xs text-yellow-700">In Progress</span>
                              <span className="text-xs font-semibold text-yellow-700">{inProg}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-indigo-100">
                              <span className="text-xs text-indigo-700">Review</span>
                              <span className="text-xs font-semibold text-indigo-700">{review}</span>
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-green-100">
                              <span className="text-xs text-green-700">Done</span>
                              <span className="text-xs font-semibold text-green-700">{done}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Teammates (Employee view) - Enhanced */}
                    {user?.role === 'employee' && Array.isArray(project.members) && project.members.length > 0 && (
                      <div className="pt-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Team Members</div>
                        <div className="flex flex-wrap gap-2">
                          {project.members.slice(0, 3).map((m) => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-xs font-medium text-blue-800 border border-blue-200">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              {m.user_name}
                            </div>
                          ))}
                          {project.members.length > 3 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                              +{project.members.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Project Actions */}
                <div className="px-6 pb-6 pt-4 mt-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:text-blue-800 transition-all duration-200 font-medium"
                      onClick={() => handleOpenKanban(project)}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Kanban
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMessages(project)}
                      className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100 hover:border-green-300 hover:text-green-800 transition-all duration-200 font-medium"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAnalytics(project)}
                      className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:text-purple-800 transition-all duration-200 font-medium"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </div>
                    </Button>

                    {user?.role === 'scrum_master' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMembers(project)}
                        className="w-full bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200 text-orange-700 hover:from-orange-100 hover:to-yellow-100 hover:border-orange-300 hover:text-orange-800 transition-all duration-200 font-medium"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Members
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingProject ? 'Edit Project' : 'Create New Project'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Project Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter project name"
                    />

                    <Textarea
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter project description"
                      rows={3}
                    />

                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    loading={projectMutation.isLoading}
                    disabled={projectMutation.isLoading}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {editingProject ? 'Update Project' : 'Create Project'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Project Messages Modal */}
      {showMessages && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseMessages}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full h-[600px]">
              <ProjectChat 
                projectId={selectedProject.id} 
                projectName={selectedProject.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Members Modal */}
      <ProjectMembersModal
        project={selectedProject}
        isOpen={showMembers}
        onClose={handleCloseMembers}
      />

      {/* Kanban Board Modal */}
      {showKanban && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseKanban}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedProject.name} - Task Board
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseKanban}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <KanbanBoard 
                  projectId={selectedProject.id} 
                  onTaskCreate={user?.role === 'scrum_master' ? handleCreateTask : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal (Scrum Master only) */}
      {user?.role === 'scrum_master' && (
        <>
          {showTaskModal && (
            <TaskModal
              task={editingTask}
              onClose={handleCloseTaskModal}
              onSuccess={handleTaskSuccess}
            />
          )}
        </>
      )}


      {/* Project Analytics Modal */}
      {showAnalytics && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseAnalytics}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Project Analytics</h3>
                      <p className="text-gray-600">{selectedProject.name} - Detailed insights and performance metrics</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseAnalytics}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="max-h-[80vh] overflow-y-auto">
                  <ProjectAnalytics 
                    projectId={selectedProjectForAnalytics}
                    projectName={selectedProject.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Chat Modal */}
      {showChat && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseChat}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Project Chat</h3>
                      <p className="text-gray-600">{selectedProject.name} - Team communication</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseChat}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="h-[600px]">
                  <ProjectChat 
                    projectId={selectedProjectForChat}
                    projectName={selectedProject.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Password Modal for Delete Project */}
      <ConfirmPasswordModal
        isOpen={!!confirmDeleteProjectId}
        title="Delete Project"
        description="Deleting this project will remove all its tasks. Confirm your password to continue."
        onCancel={() => {
          setConfirmDeleteProjectId(null);
          setConfirmError('');
        }}
        onConfirm={confirmDelete}
        isSubmitting={confirmLoading}
        errorMessage={confirmError}
      />
    </div>
  );
};

export default Projects;
