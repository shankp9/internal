'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { projectsAPI, usersAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface ProjectModalProps {
  project?: any;
  onClose: () => void;
  clients: any[];
}

export default function ProjectModal({ project, onClose, clients }: ProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const user = getStoredUser();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: project?.name || '',
      clientId: project?.clientId?._id || project?.clientId || '',
      managerId: project?.managerId?._id || project?.managerId || user?.id || '',
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      tags: project?.tags?.join(', ') || '',
      status: project?.status || 'active',
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
      const tags = data.tags
        ? data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)
        : [];

      const projectData = {
        ...data,
        tags,
      };

      if (project) {
        await projectsAPI.update(project._id, projectData);
        toast.success('Project updated successfully');
      } else {
        await projectsAPI.create(projectData);
        toast.success('Project created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-background-primary rounded-2xl shadow-large border border-border-light max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b border-border-light bg-gradient-to-r from-primary-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-text-heading">
            {project ? 'Edit Project' : 'Create Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-light hover:text-text-heading rounded-xl hover:bg-background-secondary transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-text-heading mb-2">
              Project Name <span className="text-priority-critical-text">*</span>
            </label>
            <input
              {...register('name', { required: 'Project name is required' })}
              type="text"
              id="name"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Enter project name"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-semibold text-text-heading mb-2">
              Client <span className="text-priority-critical-text">*</span>
            </label>
            <select
              {...register('clientId', { required: 'Client is required' })}
              id="clientId"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.clientId.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="managerId" className="block text-sm font-semibold text-text-heading mb-2">
              Project Manager <span className="text-priority-critical-text">*</span>
            </label>
            <select
              {...register('managerId', { required: 'Project manager is required' })}
              id="managerId"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary disabled:bg-background-secondary disabled:cursor-not-allowed"
              disabled={user?.role === 'manager'}
            >
              <option value="">Select manager</option>
              {managers.map((manager) => (
                <option key={manager._id} value={manager._id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
            {errors.managerId && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.managerId.message as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-semibold text-text-heading mb-2">
                Start Date <span className="text-priority-critical-text">*</span>
              </label>
              <input
                {...register('startDate', { required: 'Start date is required' })}
                type="date"
                id="startDate"
                className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              />
              {errors.startDate && (
                <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                  <span className="text-priority-critical-text">•</span>
                  {errors.startDate.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-semibold text-text-heading mb-2">
                End Date <span className="text-priority-critical-text">*</span>
              </label>
              <input
                {...register('endDate', { required: 'End date is required' })}
                type="date"
                id="endDate"
                className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              />
              {errors.endDate && (
                <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                  <span className="text-priority-critical-text">•</span>
                  {errors.endDate.message as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-semibold text-text-heading mb-2">
              Tags (comma-separated)
            </label>
            <input
              {...register('tags')}
              type="text"
              id="tags"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Frontend, Backend, API"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-text-heading mb-2">
              Status
            </label>
            <select
              {...register('status')}
              id="status"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-text-body bg-background-secondary rounded-xl hover:bg-border-default transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-primary-main disabled:hover:to-primary-hover flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : (
                project ? 'Update Project' : 'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
