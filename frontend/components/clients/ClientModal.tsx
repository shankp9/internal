'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { clientsAPI, usersAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface ClientModalProps {
  client?: any;
  onClose: () => void;
  users: any[];
}

export default function ClientModal({ client, onClose, users }: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>(users);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: client?.name || '',
      industry: client?.industry || '',
      accountManagerId: client?.accountManagerId?._id || client?.accountManagerId || '',
      startDate: client?.startDate ? new Date(client.startDate).toISOString().split('T')[0] : '',
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
      if (client) {
        await clientsAPI.update(client._id, data);
        toast.success('Client updated successfully');
      } else {
        await clientsAPI.create(data);
        toast.success('Client created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-background-primary rounded-2xl shadow-large border border-border-light max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b border-border-light bg-gradient-to-r from-primary-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-text-heading">
            {client ? 'Edit Client' : 'Create Client'}
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
              Client Name <span className="text-priority-critical-text">*</span>
            </label>
            <input
              {...register('name', { required: 'Client name is required' })}
              type="text"
              id="name"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Enter client name"
            />
            {errors.name && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.name.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-semibold text-text-heading mb-2">
              Industry
            </label>
            <input
              {...register('industry')}
              type="text"
              id="industry"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Enter industry"
            />
          </div>

          <div>
            <label htmlFor="accountManagerId" className="block text-sm font-semibold text-text-heading mb-2">
              Account Manager <span className="text-priority-critical-text">*</span>
            </label>
            <select
              {...register('accountManagerId', { required: 'Account manager is required' })}
              id="accountManagerId"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
            >
              <option value="">Select account manager</option>
              {managers.map((manager) => (
                <option key={manager._id} value={manager._id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
            {errors.accountManagerId && (
              <p className="mt-2 text-sm text-priority-critical-text flex items-center gap-1">
                <span className="text-priority-critical-text">•</span>
                {errors.accountManagerId.message as string}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-semibold text-text-heading mb-2">
              Start Date
            </label>
            <input
              {...register('startDate')}
              type="date"
              id="startDate"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
            />
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
                client ? 'Update Client' : 'Create Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
