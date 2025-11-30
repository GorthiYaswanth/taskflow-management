import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { projectsAPI, authAPI, tasksAPI } from '../../services/api';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Select from '../UI/Select';
import Badge from '../UI/Badge';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmModal from '../UI/ConfirmModal';
import { Users, Plus, X, User } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectMembersModal = ({ project, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Fetch project members
  const { data: members, isLoading: membersLoading } = useQuery(
    ['projectMembers', project?.id],
    () => projectsAPI.getProjectMembers(project.id),
    {
      enabled: !!project && isOpen,
    }
  );

  // Fetch per-member performance for this project (Scrum Master view)
  const { data: performanceData } = useQuery(
    ['projectMemberPerformance', project?.id],
    () => projectsAPI.getProjectMemberPerformance(project.id),
    {
      enabled: !!project && isOpen,
    }
  );

  // Fetch all employees for adding to project
  const { data: employees } = useQuery(
    'employees',
    () => authAPI.getEmployees().then(res => res.data || res),
    {
      enabled: showAddForm,
      onSuccess: (data) => {
        console.log('Employees data in ProjectMembersModal:', data);
        console.log('Is array:', Array.isArray(data));
      },
      onError: (error) => {
        console.error('Error fetching employees:', error);
      }
    }
  );

  // Fetch project tasks for assignment
  const { data: projectTasks } = useQuery(
    ['projectTasks', project?.id],
    () => tasksAPI.getTasks({ project: project.id }),
    {
      enabled: !!project && showAddForm,
      onSuccess: (data) => {
        console.log('Project tasks data:', data);
      },
      onError: (error) => {
        console.error('Error fetching project tasks:', error);
      }
    }
  );

  // Add member mutation
  const addMemberMutation = useMutation(
    async (memberData) => {
      // First add the member to the project
      const memberResponse = await projectsAPI.addProjectMember(project.id, {
        user: memberData.user,
        role: 'employee' // Default role
      });
      
      // Then assign tasks if any are selected
      if (memberData.tasks && memberData.tasks.length > 0) {
        for (const taskId of memberData.tasks) {
          await tasksAPI.updateTask(taskId, {
            assignee: memberData.user
          });
        }
      }
      
      return memberResponse;
    },
    {
      onSuccess: () => {
        // Invalidate all relevant queries to update everywhere
        queryClient.invalidateQueries(['projectMembers', project.id]);
        queryClient.invalidateQueries(['projectTasks', project.id]);
        queryClient.invalidateQueries(['projectMemberPerformance', project.id]);
        queryClient.invalidateQueries(['taskAnalytics']);
        queryClient.invalidateQueries(['smProjects']);
        queryClient.invalidateQueries(['assignedProjects']);
        queryClient.invalidateQueries(['projectSpecificAnalytics', project.id]);
        
        setSelectedUser('');
        setSelectedTasks([]);
        setShowAddForm(false);
        toast.success('Member added and tasks assigned successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to add member');
      },
    }
  );

  // Remove member mutation
  const removeMemberMutation = useMutation(
    (memberId) => projectsAPI.removeProjectMember(project.id, memberId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projectMembers', project.id]);
        toast.success('Member removed successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to remove member');
      },
    }
  );

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    addMemberMutation.mutate({
      user: selectedUser,
      tasks: selectedTasks,
    });
  };

  const handleTaskToggle = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleRemoveMember = (memberId) => {
    setMemberToRemove(memberId);
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove);
    }
    setShowConfirmModal(false);
    setMemberToRemove(null);
  };

  const handleCancelRemove = () => {
    setShowConfirmModal(false);
    setMemberToRemove(null);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage - {project.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    See assigned people, their history and completion rates
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Add Member Button */}
              <div className="mb-4">
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </div>

              {/* Add Member Form */}
              {showAddForm && (
                <Card className="p-4 mb-4">
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="space-y-4">
                      <Select
                        label="Select Employee *"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        required
                      >
                        <option value="">Choose an employee...</option>
                        {Array.isArray(employees) && employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} ({employee.email})
                          </option>
                        ))}
                      </Select>

                      {/* Task Assignment Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Tasks (Optional)
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                          {projectTasks?.data?.length > 0 ? (
                            projectTasks.data.map((task) => (
                              <label key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedTasks.includes(task.id)}
                                  onChange={() => handleTaskToggle(task.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {task.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Status: {task.status?.replace('_', ' ').toUpperCase()}
                                    {task.priority && ` • Priority: ${task.priority}`}
                                  </p>
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No tasks available for this project
                            </div>
                          )}
                        </div>
                        {selectedTasks.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        loading={addMemberMutation.isLoading}
                        disabled={addMemberMutation.isLoading}
                        size="sm"
                      >
                        Add Member
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setSelectedUser('');
                          setSelectedTasks([]);
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Members List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (() => {
                  // Normalize members response to a flat array
                  const list = Array.isArray(members)
                    ? members
                    : (Array.isArray(members?.data)
                        ? members.data
                        : (members?.data?.results || members?.data || []));
                  const perfMembers = performanceData?.data?.members || [];
                  
                  // Create a Set to track unique user IDs to prevent duplicates
                  const seenUserIds = new Set();
                  
                  // Build combined list with proper deduplication
                  const combined = [];
                  
                  // First, add explicit members
                  list.forEach(m => {
                    if (!seenUserIds.has(m.user)) {
                      seenUserIds.add(m.user);
                      combined.push({
                        id: m.id,
                        user: m.user,
                        user_name: m.user_name,
                        user_email: m.user_email,
                        role: m.role,
                        isExplicitMember: true,
                      });
                    }
                  });
                  
                  // Then add performance members who aren't already explicit members
                  perfMembers.forEach(p => {
                    if (!seenUserIds.has(p.user_id)) {
                      seenUserIds.add(p.user_id);
                      combined.push({
                        id: `assignee-${p.user_id}`,
                        user: p.user_id,
                        user_name: p.name,
                        user_email: p.email,
                        role: 'employee',
                        isExplicitMember: false,
                      });
                    }
                  });
                  if (!combined.length) {
                    return (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No members assigned yet</p>
                        <p className="text-sm text-gray-400">Add members to get started</p>
                      </div>
                    );
                  }
                  return (Array.isArray(combined) ? combined : []).map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.user_name}</p>
                            <p className="text-sm text-gray-500">{member.user_email}</p>
                            <Badge 
                              variant={member.role === 'scrum_master' ? 'primary' : 'gray'}
                              size="sm"
                              className="mt-1"
                            >
                              {member.role === 'scrum_master' ? 'Scrum Master' : (member.isExplicitMember ? 'Employee' : 'Assignee')}
                            </Badge>
                          </div>
                        </div>
                        {member.isExplicitMember && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                        )}
                      </div>

                      {(() => {
                        const perf = performanceData?.data?.members?.find(p => p.user_id === member.user);
                        if (!perf) return null;
                        const rate = perf.total_tasks ? Math.round((perf.completed_tasks / perf.total_tasks) * 100) : 0;
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                              <span>Completion Rate</span>
                              <span className="font-semibold">{rate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                              <div>
                                <div className="text-xs text-gray-500">Total</div>
                                <div className="text-sm font-semibold">{perf.total_tasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Done</div>
                                <div className="text-sm font-semibold">{perf.completed_tasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">In Progress</div>
                                <div className="text-sm font-semibold">{perf.in_progress_tasks}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">To Do</div>
                                <div className="text-sm font-semibold">{perf.todo_tasks}</div>
                              </div>
                            </div>
                            {perf.recent_tasks?.length ? (
                              <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1">Recent tasks</div>
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {Array.isArray(perf.recent_tasks) && perf.recent_tasks.map(t => (
                                    <li key={t.id} className="flex items-center justify-between">
                                      <span className="truncate mr-2">{t.title}</span>
                                      <span className="text-xs text-gray-500">{t.status.replace('_',' ')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </Card>
                  ))
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <Button
                onClick={onClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Remove Member"
        description="Are you sure you want to remove this member from the project? This action cannot be undone."
        confirmText="Remove Member"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        isSubmitting={removeMemberMutation.isLoading}
      />
    </div>
  );
};

export default ProjectMembersModal;
