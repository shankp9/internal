'use client';

import { useEffect, useState } from 'react';
import { prdAPI } from '@/lib/api';
import { format } from 'date-fns';
import { FileText, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PRDVersionHistoryProps {
  projectId: string;
}

export default function PRDVersionHistory({ projectId }: PRDVersionHistoryProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      const response = await prdAPI.getVersions(projectId);
      setVersions(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-text-light">Loading version history...</div>;
  }

  if (versions.length === 0) {
    return <div className="text-center py-8 text-text-light">No version history available</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-heading">Version History</h3>
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version._id}
            className="border border-border-default rounded-lg p-4 bg-background-secondary hover:border-primary-main transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary-main" />
                  <span className="font-semibold text-text-heading">Version {version.version}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-light mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(version.meetingDate), 'MMM dd, yyyy')}
                  </div>
                  {version.meetingId && (
                    <span>Meeting: {version.meetingId.title || 'N/A'}</span>
                  )}
                </div>
                {version.changeSummary && (
                  <p className="text-sm text-text-body">{version.changeSummary}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

