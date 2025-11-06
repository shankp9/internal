'use client';

import { useEffect, useState } from 'react';
import { prdAPI } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { Loader2, FileText, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PRDVersionHistory from './PRDVersionHistory';

interface PRDViewerProps {
  projectId: string;
}

export default function PRDViewer({ projectId }: PRDViewerProps) {
  const [prd, setPrd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadPRD();
  }, [projectId]);

  const loadPRD = async () => {
    try {
      const response = await prdAPI.getByProject(projectId);
      setPrd(response.data.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load PRD');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-main" />
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="text-center py-12 text-text-light">
        <FileText className="w-12 h-12 mx-auto mb-4 text-text-light" />
        <p>No PRD found for this project</p>
        <p className="text-sm mt-2">Upload a meeting transcript and generate a PRD to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-light pb-4">
        <div>
          <h2 className="text-xl font-bold text-text-heading">Master PRD</h2>
          <p className="text-sm text-text-light mt-1">Version {prd.version}</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-primary-main hover:bg-primary-50 rounded-lg transition-all"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide' : 'Show'} History
        </button>
      </div>
      {showHistory && (
        <div className="mb-4">
          <PRDVersionHistory projectId={projectId} />
        </div>
      )}
      <div className="prose prose-sm max-w-none bg-background-secondary rounded-xl p-6 border border-border-default">
        <ReactMarkdown>{prd.content}</ReactMarkdown>
      </div>
    </div>
  );
}

