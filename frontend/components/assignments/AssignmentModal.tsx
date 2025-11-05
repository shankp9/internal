'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { assignmentsAPI, projectsAPI, developersAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface AssignmentModalProps {
  assignment?: any;
  onClose: () => void;
}

export default function AssignmentModal({ assignment, onClose }: AssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const user = getStoredUser();

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      projectId: assignment?.projectId?._id || assignment?.projectId || '',
      developerId: assignment?.developerId?._id || assignment?.developerId || '',
      utilization: assignment?.utilization || 0,
      startDate: assignment?.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '',
      endDate: assignment?.endDate ? new Date(assignment.endDate).toISOString().split('T')[0] : '',
      tags: assignment?.tags?.join(', ') || '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, developersRes] = await Promise.all([
        projectsAPI.getAll(),
        developersAPI.getAll(),
      ]);
      setProjects(projectsRes.data.data || []);
      setDevelopers(developersRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data');
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const tags = data.tags
        ? data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag)
        : [];

      const assignmentData = {
        ...data,
        utilization: Number(data.utilization),
        tags,
      };

      if (assignment) {
        await assignmentsAPI.update(assignment._id, assignmentData);
        toast.success('Assignment updated successfully');
      } else {
        await assignmentsAPI.create(assignmentData);
        toast.success('Assignment created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const utilization = watch('utilization');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-large border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-primary-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-gray-900">
            {assignment ? 'Edit Assignment' : 'Create Assignment'}
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
          <div>
            <label htmlFor="projectId" className="block text-sm font-semibold text-gray-700 mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              {...register('projectId', { required: 'Project is required' })}
              id="projectId"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.clientId?.name})
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">•</span>
                {errors.projectId.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="developerId" className="block text-sm font-semibold text-gray-700 mb-2">
              Developer <span className="text-red-500">*</span>
            </label>
            <select
              {...register('developerId', { required: 'Developer is required' })}
              id="developerId"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
            >
              <option value="">Select developer</option>
              {developers.map((developer) => (
                <option key={developer._id} value={developer._id}>
                  {developer.name} (Available: {Math.round(developer.availableCapacity || 0)}%)
                </option>
              ))}
            </select>
            {errors.developerId && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">•</span>
                {errors.developerId.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="utilization" className="block text-sm font-semibold text-gray-700 mb-2">
              Utilization % <span className="text-red-500">*</span>
            </label>
            <input
              {...register('utilization', {
                required: 'Utilization is required',
                min: { value: 0, message: 'Utilization must be at least 0' },
                max: { value: 100, message: 'Utilization must be at most 100' },
              })}
              type="number"
              id="utilization"
              min="0"
              max="100"
              step="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
            />
            {errors.utilization && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="text-red-500">•</span>
                {errors.utilization.message as string}
              </p>
            )}
            {utilization && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      utilization > 100 ? 'bg-red-600' :
                      utilization > 80 ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(100, utilization)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {utilization > 100 ? '⚠️ Over-utilization detected' : 
                   utilization > 80 ? '⚡ High utilization' : 
                   '✓ Optimal utilization'}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('startDate', { required: 'Start date is required' })}
                type="date"
                id="startDate"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              />
              {errors.startDate && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.startDate.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('endDate', { required: 'End date is required' })}
                type="date"
                id="endDate"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              />
              {errors.endDate && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="text-red-500">•</span>
                  {errors.endDate.message as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              {...register('tags')}
              type="text"
              id="tags"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="Frontend, Backend, API"
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas</p>
          </div>

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
                assignment ? 'Update Assignment' : 'Create Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
