'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, User, Calendar, Tag } from 'lucide-react';
import TaskBreakdownView from './TaskBreakdownView';

interface SuggestionCardProps {
  suggestion: any;
  onApprove: () => void;
  onReject: (reason?: string) => void;
}

export default function SuggestionCard({ suggestion, onApprove, onReject }: SuggestionCardProps) {
  const [showTasks, setShowTasks] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  return (
    <div className="border border-border-default rounded-xl p-4 bg-background-secondary">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-text-heading mb-2">{suggestion.title}</h4>
          {suggestion.description && (
            <p className="text-sm text-text-body mb-3">{suggestion.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-light">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {suggestion.developerId?.name || 'Unknown Developer'}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(suggestion.suggestedStartDate), 'MMM dd')} - {format(new Date(suggestion.suggestedEndDate), 'MMM dd')}
            </div>
            <div className="px-2 py-1 bg-primary-main/10 text-primary-main rounded text-xs">
              {suggestion.suggestedUtilization}% utilization
            </div>
            {suggestion.tags && suggestion.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {suggestion.tags.join(', ')}
              </div>
            )}
          </div>
          {suggestion.reasoning && (
            <div className="mt-3 p-3 bg-primary-50/50 rounded-lg">
              <p className="text-xs font-medium text-text-heading mb-1">AI Reasoning:</p>
              <p className="text-sm text-text-body">{suggestion.reasoning}</p>
            </div>
          )}
        </div>
      </div>

      {suggestion.taskBreakdown && (
        <div>
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="text-sm text-primary-main hover:text-primary-hover mb-3"
          >
            {showTasks ? 'Hide' : 'Show'} Task Breakdown
          </button>
          {showTasks && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <TaskBreakdownView taskBreakdown={suggestion.taskBreakdown} />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-light">
        <button
          onClick={onApprove}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
        >
          <Check className="w-4 h-4" />
          Approve
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="flex-1 px-3 py-2 text-sm border border-border-default rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
          <button
            onClick={() => onReject(rejectionReason)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

