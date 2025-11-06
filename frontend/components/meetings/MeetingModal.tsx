'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { meetingsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X, Upload, File, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface MeetingModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type ProgressState = 'idle' | 'uploading' | 'processing' | 'generating-prd' | 'completed' | 'error';

export default function MeetingModal({ projectId, onClose, onSuccess }: MeetingModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progressState, setProgressState] = useState<ProgressState>('idle');
  const [progressMessage, setProgressMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      meetingDate: new Date().toISOString().split('T')[0],
      participants: '',
      agenda: '',
      summary: '',
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.txt', '.pdf', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(ext)) {
      toast.error('Invalid file type. Please upload .txt, .pdf, or .docx files.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: loading || progressState !== 'idle',
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setProgressState('uploading');
    setProgressMessage('Uploading transcript file...');

    try {
      const participants = data.participants
        ? data.participants.split('\n')
            .map((p: string) => {
              const parts = p.trim().split(',').map(s => s.trim());
              return {
                name: parts[0] || '',
                role: parts[1] || '',
                email: parts[2] || '',
              };
            })
            .filter((p: any) => p.name.trim() !== '') // Only include participants with a name
        : [];

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('meetingDate', data.meetingDate);
      formData.append('participants', JSON.stringify(participants));
      formData.append('agenda', data.agenda || '');
      formData.append('summary', data.summary || '');
      
      if (selectedFile) {
        formData.append('transcript', selectedFile);
        formData.append('autoGeneratePRD', 'true');
      }

      setProgressState('processing');
      setProgressMessage('Processing transcript file...');

      const response = await meetingsAPI.create(projectId, formData);

      if (selectedFile && response.data.data.transcript) {
        setProgressState('generating-prd');
        setProgressMessage('Analyzing transcript and generating PRD...');
        
        // Wait a bit to show the PRD generation state
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setProgressState('completed');
      setProgressMessage(selectedFile ? 'Meeting created and PRD generated successfully!' : 'Meeting created successfully!');
      
      toast.success(selectedFile ? 'Meeting created and PRD generated successfully!' : 'Meeting created successfully!');
      
      // Small delay to show success state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      setProgressState('error');
      setProgressMessage('Failed to create meeting');
      toast.error(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
      setProgressState('idle');
      setProgressMessage('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-background-primary rounded-2xl shadow-large border border-border-light max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="flex items-center justify-between p-6 border-b border-border-light bg-gradient-to-r from-primary-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-text-heading">Create Meeting</h2>
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
            <label htmlFor="title" className="block text-sm font-semibold text-text-heading mb-2">
              Meeting Title <span className="text-priority-critical-text">*</span>
            </label>
            <input
              {...register('title', { required: 'Meeting title is required' })}
              type="text"
              id="title"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Enter meeting title"
            />
            {errors.title && (
              <p className="mt-2 text-sm text-priority-critical-text">{errors.title.message as string}</p>
            )}
          </div>

          <div>
            <label htmlFor="meetingDate" className="block text-sm font-semibold text-text-heading mb-2">
              Meeting Date <span className="text-priority-critical-text">*</span>
            </label>
            <input
              {...register('meetingDate', { required: 'Meeting date is required' })}
              type="date"
              id="meetingDate"
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
            />
            {errors.meetingDate && (
              <p className="mt-2 text-sm text-priority-critical-text">{errors.meetingDate.message as string}</p>
            )}
          </div>

          <div>
            <label htmlFor="participants" className="block text-sm font-semibold text-text-heading mb-2">
              Participants (one per line: Name, Role, Email)
            </label>
            <textarea
              {...register('participants')}
              id="participants"
              rows={4}
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="John Doe, Project Manager, john@example.com&#10;Jane Smith, Developer, jane@example.com"
            />
          </div>

          <div>
            <label htmlFor="agenda" className="block text-sm font-semibold text-text-heading mb-2">
              Agenda
            </label>
            <textarea
              {...register('agenda')}
              id="agenda"
              rows={3}
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Meeting agenda items..."
            />
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-semibold text-text-heading mb-2">
              Summary
            </label>
            <textarea
              {...register('summary')}
              id="summary"
              rows={3}
              className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              placeholder="Meeting summary..."
            />
          </div>

          {/* Transcript Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-text-heading mb-2">
              Meeting Transcript (Optional)
            </label>
            <p className="text-xs text-text-light mb-3">
              Upload a transcript file to automatically generate PRD and assignment suggestions
            </p>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-primary-main bg-primary-50/50'
                  : 'border-border-default hover:border-primary-main hover:bg-background-secondary'
              } ${loading || progressState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <File className="w-8 h-8 text-primary-main" />
                  <div>
                    <p className="text-text-heading font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-text-light mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  {!loading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-xs text-priority-critical-text hover:text-priority-critical-hover"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-text-light" />
                  <div>
                    <p className="text-text-heading font-medium">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop transcript file'}
                    </p>
                    <p className="text-sm text-text-light mt-1">or click to select</p>
                    <p className="text-xs text-text-light mt-2">Supported: .txt, .pdf, .docx (max 10MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {(progressState !== 'idle' && progressState !== 'completed') && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Loader2 className={`w-5 h-5 text-primary-main ${progressState !== 'error' ? 'animate-spin' : ''}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-heading">{progressMessage}</p>
                  {progressState === 'uploading' && (
                    <div className="mt-2 w-full bg-primary-200 rounded-full h-2">
                      <div className="bg-primary-main h-2 rounded-full animate-pulse" style={{ width: '30%' }}></div>
                    </div>
                  )}
                  {progressState === 'processing' && (
                    <div className="mt-2 w-full bg-primary-200 rounded-full h-2">
                      <div className="bg-primary-main h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  )}
                  {progressState === 'generating-prd' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-main animate-pulse" />
                      <div className="flex-1 bg-primary-200 rounded-full h-2">
                        <div className="bg-primary-main h-2 rounded-full animate-pulse" style={{ width: '90%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {progressState === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">{progressMessage}</p>
              </div>
            </div>
          )}

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
              className="px-5 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

