import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Badge from '../../components/UI/Badge';
import { User, Mail, Calendar, Shield, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [loading, setLoading] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateProfile(profileData);
    setLoading(false);
    
    if (result.success) {
      setProfileData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        username: user?.username || '',
        email: user?.email || '',
      });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    const result = await changePassword(passwordData);
    setLoading(false);
    
    if (result.success) {
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      });
    }
  };

  const getRoleIcon = (role) => {
    return role === 'scrum_master' ? (
      <Shield className="h-5 w-5 text-blue-600" />
    ) : (
      <UserCheck className="h-5 w-5 text-gray-600" />
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {getRoleIcon(user?.role)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.get_full_name || user?.username}
              </h2>
              <p className="text-gray-600 mb-2">{user?.email}</p>
              {getRoleBadge(user?.role)}
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Username: {user?.username}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(user?.date_joined), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Settings */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'profile'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'password'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Change Password
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                    required
                  />
                  <Input
                    label="Last Name"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                
                <Input
                  label="Username"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  required
                />
                
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />
                
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                >
                  Update Profile
                </Button>
              </form>
            </Card>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  label="Current Password"
                  name="old_password"
                  type="password"
                  value={passwordData.old_password}
                  onChange={handlePasswordChange}
                  required
                />
                
                <Input
                  label="New Password"
                  name="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                />
                
                <Input
                  label="Confirm New Password"
                  name="new_password_confirm"
                  type="password"
                  value={passwordData.new_password_confirm}
                  onChange={handlePasswordChange}
                  required
                />
                
                <Button
                  type="submit"
                  loading={loading}
                  disabled={loading}
                >
                  Change Password
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
