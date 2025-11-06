'use client';

import { useEffect, useState } from 'react';
import { meetingsAPI } from '@/lib/api';
import { format } from 'date-fns';
import { Calendar, FileText, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AgentPipelineLoader from './AgentPipelineLoader';

interface MeetingListProps {
  projectId: string;
  onSelectMeeting?: (meetingId: string) => void;
  refreshTrigger?: number; // Add refresh trigger prop
  highlightMeetingId?: string; // Meeting ID to highlight
}

export default function MeetingList({ projectId, onSelectMeeting, refreshTrigger, highlightMeetingId }: MeetingListProps) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineActiveMeetings, setPipelineActiveMeetings] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMeetings();
  }, [projectId, refreshTrigger]); // Add refreshTrigger to dependencies

  // Scroll to and highlight newly created meeting
  useEffect(() => {
    if (highlightMeetingId && meetings.length > 0 && !loading) {
      const meeting = meetings.find((m) => m._id === highlightMeetingId);
      if (meeting) {
        // Delay to ensure DOM is fully updated and rendered
        setTimeout(() => {
          const element = document.getElementById(`meeting-${highlightMeetingId}`);
          if (element) {
            // Scroll to the element
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            // Add a slight delay before removing highlight to ensure it's visible
            setTimeout(() => {
              const stillHighlighted = document.getElementById(`meeting-${highlightMeetingId}`);
              if (stillHighlighted) {
                stillHighlighted.classList.remove('ring-4', 'ring-primary-main', 'shadow-lg', 'animate-pulse');
              }
            }, 3000);
          }
        }, 300);
      }
    }
  }, [highlightMeetingId, meetings, loading]);

  const loadMeetings = async () => {
    try {
      const response = await meetingsAPI.getByProject(projectId);
      setMeetings(response.data.data || []);
      
      // Check which meetings have transcripts (pipeline might be running)
      const meetingsWithTranscripts = response.data.data
        .filter((m: any) => m.transcriptId)
        .map((m: any) => m._id);
      setPipelineActiveMeetings(new Set(meetingsWithTranscripts));
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePRD = async (meetingId: string) => {
    try {
      await meetingsAPI.generatePRD(meetingId);
      toast.success('PRD generation started');
      setPipelineActiveMeetings((prev) => new Set(prev).add(meetingId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate PRD');
    }
  };

  const handleGenerateAssignments = async (meetingId: string) => {
    try {
      await meetingsAPI.generateAssignments(meetingId);
      toast.success('Assignment generation started');
      setPipelineActiveMeetings((prev) => new Set(prev).add(meetingId));
      loadMeetings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate assignments');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-text-light">Loading meetings...</div>;
  }

  return (
    <div className="space-y-4">
      {meetings.length === 0 ? (
        <div className="text-center py-8 text-text-light">No meetings found</div>
      ) : (
        meetings.map((meeting) => {
          // Show pipeline loader for meetings with transcripts (pipeline runs automatically after creation)
          const isHighlighted = highlightMeetingId === meeting._id;
          const hasPipeline = meeting.transcriptId;
          
          return (
            <div
              id={`meeting-${meeting._id}`}
              key={meeting._id}
              className={`border rounded-xl p-4 hover:border-primary-main transition-all bg-background-secondary ${
                isHighlighted
                  ? 'ring-4 ring-primary-main shadow-lg border-primary-main animate-pulse'
                  : 'border-border-default'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-heading">{meeting.title}</h3>
                    {meeting.transcriptId && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                        <FileText className="w-3 h-3" />
                        Pipeline Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-light mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(meeting.meetingDate), 'MMM dd, yyyy')}
                    </div>
                    {meeting.transcriptId && (
                      <div className="flex items-center gap-1 text-primary-main">
                        <FileText className="w-4 h-4" />
                        Transcript uploaded
                      </div>
                    )}
                  </div>
                  {meeting.summary && (
                    <p className="text-sm text-text-body mb-3 line-clamp-2">{meeting.summary}</p>
                  )}
                </div>
              </div>
              
              {/* Agent Pipeline Loader - Show for all meetings with transcripts */}
              {hasPipeline && (
                <div className="mt-4 pt-4 border-t border-border-light">
                  <AgentPipelineLoader meetingId={meeting._id} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

