'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { authAPI, usersAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface UserModalProps {
  user?: any;
  onClose: () => void;
}

export default function UserModal({ user, onClose }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [isNew, setIsNew] = useState(!user);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'employee',
      managerId: user?.managerId?._id || user?.managerId || '',
      skills: user?.skills?.join(', ') || '',
      isActive: user?.isActive !== undefined ? user.isActive : true,
    },
  });

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'manager' });
      setManagers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load managers');
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const skills = data.skills
        ? data.skills.split(',').map((skill: string) => skill.trim()).filter((skill: string) => skill)
        : [];

      const userData: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        managerId: data.managerId || null,
        skills,
        isActive: data.isActive,
      };

      if (isNew) {
        if (!data.password) {
          toast.error('Password is required for new users');
          setLoading(false);
          return;
        }
        userData.password = data.password;
        await authAPI.register(userData);
        toast.success('User created successfully');
      } else {
        await usersAPI.update(user._id, userData);
        toast.success('User updated successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-large border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-primary-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Create User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                type="text"
                id="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter name"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                id="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.email.message as string}
                </p>
              )}
            </div>
          </div>

          {isNew && (
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                {...register('password', {
                  required: isNew ? 'Password is required' : false,
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                type="password"
                id="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter password"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.password.message as string}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                id="role"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.role.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="managerId" className="block text-sm font-semibold text-gray-700 mb-2">
                Manager
              </label>
              <select
                {...register('managerId')}
                id="managerId"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              >
                <option value="">No Manager</option>
                {managers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="skills" className="block text-sm font-semibold text-gray-700 mb-2">
              Skills (comma-separated)
            </label>
            <input
              {...register('skills')}
              type="text"
              id="skills"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="JavaScript, React, Node.js"
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
          </div>

          {!isNew && (
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  {...register('isActive')}
                  type="checkbox"
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">Active User</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-soft hover:shadow-medium font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-600 disabled:hover:to-primary-700 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                isNew ? 'Create User' : 'Update User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
