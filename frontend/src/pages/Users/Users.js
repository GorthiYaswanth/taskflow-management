import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ConfirmPasswordModal from '../../components/UI/ConfirmPasswordModal';
import {
  Plus,
  Search,
  User,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  Users as UsersIcon,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Users = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    password: '',
    password_confirm: '',
  });

  // Fetch users
  const { data: users, isLoading, error } = useQuery(
    'users',
    authAPI.getUsers,
    {
      enabled: user?.role === 'scrum_master',
    }
  );

  // Create/Update user mutation
  const userMutation = useMutation(
    (data) => editingUser ? authAPI.updateUser(editingUser.id, data) : authAPI.createUser(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowModal(false);
        setEditingUser(null);
        setFormData({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          role: 'employee',
        });
        toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Operation failed');
      },
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => authAPI.deleteUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to delete user');
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
    if (!formData.username.trim() || !formData.email.trim()) {
      toast.error('Username and email are required');
      return;
    }
    userMutation.mutate(formData);
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setFormData({
      username: userData.username,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
    });
    setShowModal(true);
  };

  const handleDeleteUser = (userId) => {
    setConfirmError('');
    setConfirmDeleteUserId(userId);
  };

  const confirmDelete = async (password) => {
    if (!confirmDeleteUserId) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      await authAPI.login(user?.email, password);
      deleteUserMutation.mutate(confirmDeleteUserId, {
        onSettled: () => {
          setConfirmLoading(false);
          setConfirmDeleteUserId(null);
        }
      });
    } catch (e) {
      setConfirmLoading(false);
      setConfirmError('Incorrect password. Please try again.');
    }
  };

  const getRoleBadge = (role) => {
    const variants = {
      scrum_master: 'primary',
      employee: 'gray',
    };
    return (
      <Badge variant={variants[role]}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getRoleIcon = (role) => {
    return role === 'scrum_master' ? (
      <Shield className="h-4 w-4 text-blue-600" />
    ) : (
      <UserCheck className="h-4 w-4 text-gray-600" />
    );
  };

  const roleOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'scrum_master', label: 'Scrum Master' },
  ];

  // Normalize and filter users (supports array or paginated response)
  const userList = Array.isArray(users?.data)
    ? users.data
    : (users?.data?.results || []);

  const filteredUsers = userList.filter(userData =>
    userData.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    userData.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (user?.role !== 'scrum_master') {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Access denied. Only Scrum Masters can view this page.</p>
      </div>
    );
  }

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
        <p className="text-red-500">Failed to load users</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-8 border border-purple-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg">
              <UsersIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gradient-purple mb-2">Users</h1>
              <p className="text-xl text-gray-600">Manage team members and their roles</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                role: 'employee',
                password: '',
                password_confirm: '',
              });
              setShowModal(true);
            }}
            className="flex items-center gap-3 px-6 py-3 h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <UserPlus className="h-5 w-5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No users found matching your search' : 'No users found'}
              </p>
            </Card>
          </div>
        ) : (
          filteredUsers.map((userData) => (
            <Card key={userData.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* User Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getRoleIcon(userData.role)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {userData.get_full_name || userData.username}
                      </h3>
                      {getRoleBadge(userData.role)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditUser(userData)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(userData.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {userData.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(userData.date_joined), 'MMM dd, yyyy')}
                  </div>
                </div>

                {/* User Stats */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Username:</span>
                    <span className="font-medium">{userData.username}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingUser ? 'Edit User' : 'Add New User'}
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
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        placeholder="First name"
                      />
                      <Input
                        label="Last Name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        placeholder="Last name"
                      />
                    </div>

                    <Input
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      placeholder="Username"
                    />

                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Email address"
                    />

                    <Select
                      label="Role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      options={roleOptions}
                      required
                    />

                    {!editingUser && (
                      <>
                        <Input
                          label="Password"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter password"
                        />

                        <Input
                          label="Confirm Password"
                          name="password_confirm"
                          type="password"
                          value={formData.password_confirm}
                          onChange={handleInputChange}
                          required
                          placeholder="Confirm password"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    loading={userMutation.isLoading}
                    disabled={userMutation.isLoading}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {editingUser ? 'Update User' : 'Add User'}
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
      {/* Confirm Password Modal for Delete User */}
      <ConfirmPasswordModal
        isOpen={!!confirmDeleteUserId}
        title="Delete User"
        description="Deleting this user cannot be undone. Confirm your password to proceed."
        onCancel={() => {
          setConfirmDeleteUserId(null);
          setConfirmError('');
        }}
        onConfirm={confirmDelete}
        isSubmitting={confirmLoading}
        errorMessage={confirmError}
      />
    </div>
  );
};

export default Users;
