'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { getStoredUser, User, setStoredUser } from '@/lib/auth';
import { profileAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { UserCircle, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    skills: '',
  });

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(storedUser);
    setProfileData({
      name: storedUser.name || '',
      password: '',
      newPassword: '',
      confirmPassword: '',
      skills: (storedUser.skills || []).join(', ') || '',
    });
  }, [router]);

  const handleProfileUpdate = async () => {
    if (!user) return;

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (profileData.newPassword && profileData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        name: profileData.name,
      };

      if (profileData.newPassword) {
        updateData.password = profileData.newPassword;
      }

      if (profileData.skills) {
        updateData.skills = profileData.skills
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
      }

      const response = await profileAPI.update(updateData);
      const updatedUser = { ...user, ...response.data.data };
      setUser(updatedUser);
      setStoredUser(updatedUser);
      setProfileData({
        ...profileData,
        password: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-text-muted">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
      <div className="bg-background-primary rounded-xl shadow-soft border border-border-light p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-main to-primary-hover rounded-full flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-heading">Profile Settings</h1>
            <p className="text-sm text-text-muted mt-1">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
            <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background-primary border border-border-light rounded-lg text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-background-secondary border border-border-light rounded-lg text-text-muted cursor-not-allowed"
                />
                <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  disabled
                  className="w-full px-4 py-2.5 bg-background-secondary border border-border-light rounded-lg text-text-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={profileData.skills}
                  onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background-primary border border-border-light rounded-lg text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent"
                  placeholder="React, Node.js, Python, TypeScript"
                />
                <p className="text-xs text-text-muted mt-1">Separate multiple skills with commas</p>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
            <h2 className="text-lg font-semibold text-text-heading mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background-primary border border-border-light rounded-lg text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent"
                  placeholder="Enter new password (leave blank to keep current)"
                />
                <p className="text-xs text-text-muted mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-heading mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background-primary border border-border-light rounded-lg text-text-heading focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-semibold text-text-heading bg-background-secondary hover:bg-background-primary border border-border-light rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleProfileUpdate}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-main hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}

