'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { meetingsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X, Upload, File, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import StreamingTextField from './StreamingTextField';

interface MeetingModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: (meetingId?: string) => void;
}

type Step = 'upload' | 'extract' | 'edit';

export default function MeetingModal({ projectId, onClose, onSuccess }: MeetingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState({
    title: '',
    summary: '',
    agenda: '',
    participants: [] as Array<{ name: string; role: string; email: string }>,
  });
  const [streamingFields, setStreamingFields] = useState({
    title: false,
    summary: false,
    agenda: false,
    participants: false,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
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
    disabled: loading || currentStep !== 'upload',
  });

  const handleExtractDetails = async () => {
    if (!selectedFile) {
      toast.error('Please upload a transcript file first');
      return;
    }

    setIsExtracting(true);
    setCurrentStep('extract');
    setStreamingFields({ title: true, summary: true, agenda: true, participants: true });

    try {
      await meetingsAPI.extractTranscript(selectedFile, (data) => {
        if (data.type === 'start') {
          // Reset extracted data
          setExtractedData({ title: '', summary: '', agenda: '', participants: [] });
        } else if (data.type === 'field' && data.field) {
          // Update specific field
          setStreamingFields((prev) => ({ ...prev, [data.field!]: false }));
          
          if (data.field === 'participants' && data.text) {
            try {
              const participants = JSON.parse(data.text);
              setExtractedData((prev) => ({ ...prev, participants }));
              setValue('participants', participants.map((p: any) => `${p.name}, ${p.role}, ${p.email || ''}`).join('\n'));
            } catch (e) {
              console.error('Failed to parse participants:', e);
            }
          } else if (data.field && data.text) {
            setExtractedData((prev) => ({ ...prev, [data.field!]: data.text! }));
            setValue(data.field, data.text);
          }
        } else if (data.type === 'complete' && data.data) {
          // All fields complete
          setExtractedData(data.data);
          setValue('title', data.data.title);
          setValue('summary', data.data.summary);
          setValue('agenda', data.data.agenda);
          setValue('participants', data.data.participants.map((p: any) => `${p.name}, ${p.role}, ${p.email || ''}`).join('\n'));
          setStreamingFields({ title: false, summary: false, agenda: false, participants: false });
          setCurrentStep('edit');
          setIsExtracting(false);
          toast.success('Meeting details extracted successfully!');
        } else if (data.type === 'error') {
          setStreamingFields({ title: false, summary: false, agenda: false, participants: false });
          setIsExtracting(false);
          toast.error(data.message || 'Failed to extract meeting details');
          setCurrentStep('upload');
        }
      });
    } catch (error: any) {
      setStreamingFields({ title: false, summary: false, agenda: false, participants: false });
      setIsExtracting(false);
      toast.error(error.message || 'Failed to extract meeting details');
      setCurrentStep('upload');
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);

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
            .filter((p: any) => p.name.trim() !== '')
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

      const response = await meetingsAPI.create(projectId, formData);
      const createdMeetingId = response.data.data.meeting._id;

      toast.success('Meeting created successfully!');
      
      // Pass the created meeting ID to onSuccess for scrolling
      onSuccess?.(createdMeetingId);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const titleValue = watch('title');
  const summaryValue = watch('summary');
  const agendaValue = watch('agenda');

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
          {/* Step 1: Upload Transcript */}
          {currentStep === 'upload' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-heading mb-2">
                  Meeting Transcript <span className="text-priority-critical-text">*</span>
                </label>
                <p className="text-xs text-text-light mb-3">
                  Upload a transcript file to extract meeting details automatically
                </p>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-primary-main bg-primary-50/50'
                      : 'border-border-default hover:border-primary-main hover:bg-background-secondary'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleExtractDetails}
                  disabled={isExtracting}
                  className="w-full px-5 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Extract Meeting Details
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 2 & 3: Extract and Edit */}
          {(currentStep === 'extract' || currentStep === 'edit') && (
            <div className="space-y-5">
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

              <StreamingTextField
                label="Meeting Title"
                value={titleValue}
                onChange={(value) => setValue('title', value)}
                placeholder="Enter meeting title"
                isStreaming={streamingFields.title}
                className=""
              />
              {errors.title && (
                <p className="mt-2 text-sm text-priority-critical-text">{errors.title.message as string}</p>
              )}

              <StreamingTextField
                label="Summary"
                value={summaryValue}
                onChange={(value) => setValue('summary', value)}
                placeholder="Meeting summary..."
                rows={4}
                isStreaming={streamingFields.summary}
                className=""
              />

              <StreamingTextField
                label="Agenda"
                value={agendaValue}
                onChange={(value) => setValue('agenda', value)}
                placeholder="Meeting agenda items..."
                rows={3}
                isStreaming={streamingFields.agenda}
                className=""
              />

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
            {currentStep === 'edit' && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Meeting'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
