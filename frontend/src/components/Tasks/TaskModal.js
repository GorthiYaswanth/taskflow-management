import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { tasksAPI, projectsAPI, authAPI } from '../../services/api';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';
import Textarea from '../UI/Textarea';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmPasswordModal from '../UI/ConfirmPasswordModal';

const TaskModal = ({ task, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    assignee_ids: [],
    priority: 'medium',
    status: 'todo',
    due_date: '',
  });
  const [multiAssign, setMultiAssign] = useState(false);
  const [errors, setErrors] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  // Fetch projects and employees
  const { data: projects } = useQuery('projects', projectsAPI.getProjects);
  const { data: employees, isLoading: employeesLoading, error: employeesError } = useQuery(
    'employees',
    () => authAPI.getEmployees().then(res => res.data || res),
    {
      enabled: user?.role === 'scrum_master',
      onSuccess: (data) => {
        console.log('Employees data:', data);
        console.log('Is array:', Array.isArray(data));
      },
      onError: (error) => {
        console.error('Error fetching employees:', error);
      }
    }
  );

  // Create/Update task mutation
  const taskMutation = useMutation(
    (data) => task ? tasksAPI.updateTask(task.id, data) : tasksAPI.createTask(data),
    {
      onSuccess: () => {
        toast.success(task ? 'Task updated successfully' : 'Task created successfully');
        onSuccess();
      },
      onError: (error) => {
        const message = error.response?.data?.detail || 'Operation failed';
        toast.error(message);
      },
    }
  );

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        project: task.project || '',
        assignee: task.assignee || '',
        assignee_ids: task.assignees ? task.assignees.map(a => a.user) : [],
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };


  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.project) {
      newErrors.project = 'Project is required';
    }

    if (!formData.priority) {
      newErrors.priority = 'Priority is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (user?.role === 'scrum_master') {
      if (!multiAssign) {
        if (!formData.assignee) newErrors.assignee = 'Select one employee';
      } else {
        if (!Array.isArray(formData.assignee_ids) || formData.assignee_ids.length === 0) {
          newErrors.assignee_ids = 'Select at least one employee';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = {
      title: formData.title,
      description: formData.description,
      project: formData.project ? parseInt(formData.project, 10) : null,
      assignee: !multiAssign && formData.assignee ? parseInt(formData.assignee, 10) : null,
      assignee_ids: multiAssign ? formData.assignee_ids : (formData.assignee ? [parseInt(formData.assignee, 10)] : []),
      priority: formData.priority,
      status: formData.status,
      due_date: formData.due_date || null,
    };

    if (task) {
      setPendingData(submitData);
      setConfirmError('');
      setShowConfirm(true);
      return;
    }
    taskMutation.mutate(submitData);
  };

  const confirmEdit = async (password) => {
    if (!pendingData) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await authAPI.login(user?.email, password);
      taskMutation.mutate(pendingData, {
        onSettled: () => {
          setConfirmLoading(false);
          setShowConfirm(false);
          setPendingData(null);
        }
      });
    } catch (e) {
      setConfirmLoading(false);
      setConfirmError('Incorrect password. Please try again.');
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  const projectArray = Array.isArray(projects)
    ? projects
    : (Array.isArray(projects?.data)
        ? projects.data
        : (projects?.data?.results || []));

  const projectOptions = projectArray.map(project => ({
    value: project.id,
    label: project.name,
  }));

  const employeesArray = Array.isArray(employees)
    ? employees
    : (Array.isArray(employees?.results)
        ? employees.results
        : (Array.isArray(employees?.data)
            ? employees.data
            : (employees?.data?.results || [])));

  const assigneeOptions = employeesArray.map(emp => ({
    value: emp.id,
    label: emp.get_full_name || emp.username,
  }));

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {task ? 'Edit Task' : 'Create New Task'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                  required
                  placeholder="Enter task title"
                />

                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter task description"
                  rows={3}
                />

                <Select
                  label="Project"
                  name="project"
                  value={formData.project}
                  onChange={handleChange}
                  options={projectOptions}
                  error={errors.project}
                  required
                  placeholder="Select project"
                />

                {user?.role === 'scrum_master' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Assign to Employees
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={multiAssign}
                          onChange={(e) => setMultiAssign(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Assign to multiple
                      </label>
                    </div>
                    {employeesLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-sm text-gray-500">Loading employees...</p>
                      </div>
                    ) : employeesError ? (
                      <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
                        <p className="text-sm text-red-500">Error loading employees</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {!multiAssign ? (
                          <Select
                            name="assignee"
                            value={formData.assignee}
                            onChange={handleChange}
                            options={assigneeOptions}
                            placeholder="Select an employee"
                            error={errors.assignee}
                          />
                        ) : (
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                            {Array.isArray(employeesArray) && employeesArray.length > 0 ? (
                              employeesArray.map((employee) => (
                                <label key={employee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.assignee_ids.includes(employee.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({
                                          ...prev,
                                          assignee_ids: [...prev.assignee_ids, employee.id]
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          assignee_ids: prev.assignee_ids.filter(id => id !== employee.id)
                                        }));
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {employee.first_name} {employee.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{employee.email}</p>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 p-2">No employees available</p>
                            )}
                          </div>
                        )}
                        {formData.assignee_ids.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.assignee_ids.map((assigneeId) => {
                              const employee = employeesArray.find(emp => emp.id === assigneeId);
                              return employee ? (
                                <span
                                  key={assigneeId}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {employee.first_name} {employee.last_name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        assignee_ids: prev.assignee_ids.filter(id => id !== assigneeId)
                                      }));
                                    }}
                                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Choose a single assignee or enable multi-assign to select multiple employees.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={priorityOptions}
                    error={errors.priority}
                    required
                    placeholder="Select priority"
                  />

                  <Select
                    label="Status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={statusOptions}
                    error={errors.status}
                    required
                    placeholder="Select status"
                  />
                </div>

                <Input
                  label="Due Date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                loading={taskMutation.isLoading}
                disabled={taskMutation.isLoading}
                className="w-full sm:w-auto sm:ml-3"
              >
                {task ? 'Update Task' : 'Create Task'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mt-3 w-full sm:mt-0 sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <ConfirmPasswordModal
      isOpen={showConfirm}
      title="Confirm Task Update"
      description="Enter your password to apply changes to this task."
      onCancel={() => {
        setShowConfirm(false);
        setPendingData(null);
        setConfirmError('');
      }}
      onConfirm={confirmEdit}
      isSubmitting={confirmLoading}
      errorMessage={confirmError}
    />
    </>
  );
};

export default TaskModal;
