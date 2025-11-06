'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { meetingsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface TranscriptUploadProps {
  meetingId: string;
  onSuccess?: () => void;
}

export default function TranscriptUpload({ meetingId, onSuccess }: TranscriptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

    setUploadedFile(file);
    setUploading(true);

    try {
      await meetingsAPI.uploadTranscript(meetingId, file);
      toast.success('Transcript uploaded successfully');
      setUploadedFile(null);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload transcript');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  }, [meetingId, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-main bg-primary-50/50'
            : 'border-border-default hover:border-primary-main hover:bg-background-secondary'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-main animate-spin" />
            <p className="text-text-body">Uploading transcript...</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center gap-3">
            <File className="w-8 h-8 text-primary-main" />
            <p className="text-text-heading font-medium">{uploadedFile.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-text-light" />
            <div>
              <p className="text-text-heading font-medium mb-1">
                {isDragActive ? 'Drop the file here' : 'Drag & drop transcript file'}
              </p>
              <p className="text-sm text-text-light">or click to select</p>
              <p className="text-xs text-text-light mt-2">Supported formats: .txt, .pdf, .docx (max 10MB)</p>
            </div>
          </div>
        )}
      </div>
      {uploadedFile && !uploading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setUploadedFile(null);
          }}
          className="flex items-center gap-2 text-sm text-priority-critical-text hover:text-priority-critical-hover"
        >
          <X className="w-4 h-4" />
          Remove file
        </button>
      )}
    </div>
  );
}

