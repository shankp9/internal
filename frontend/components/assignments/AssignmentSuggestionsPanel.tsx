'use client';

import { useEffect, useState } from 'react';
import { assignmentSuggestionsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import SuggestionCard from './SuggestionCard';

interface AssignmentSuggestionsPanelProps {
  projectId: string;
  onRefresh?: () => void;
}

export default function AssignmentSuggestionsPanel({ projectId, onRefresh }: AssignmentSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, [projectId]);

  const loadSuggestions = async () => {
    try {
      const response = await assignmentSuggestionsAPI.getByProject(projectId, { status: 'pending' });
      setSuggestions(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (suggestionId: string) => {
    try {
      await assignmentSuggestionsAPI.approve(suggestionId);
      toast.success('Assignment suggestion approved');
      loadSuggestions();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve suggestion');
    }
  };

  const handleReject = async (suggestionId: string, reason?: string) => {
    try {
      await assignmentSuggestionsAPI.reject(suggestionId, reason);
      toast.success('Assignment suggestion rejected');
      loadSuggestions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject suggestion');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-text-light">Loading suggestions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-heading">
          AI-Generated Assignment Suggestions ({suggestions.length})
        </h3>
      </div>
      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-text-light">No pending suggestions</div>
      ) : (
        suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion._id}
            suggestion={suggestion}
            onApprove={() => handleApprove(suggestion._id)}
            onReject={(reason) => handleReject(suggestion._id, reason)}
          />
        ))
      )}
    </div>
  );
}

