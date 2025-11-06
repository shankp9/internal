'use client';

import { useEffect, useState } from 'react';
import { meetingsAPI } from '@/lib/api';
import { format } from 'date-fns';
import { Calendar, FileText, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MeetingListProps {
  projectId: string;
  onSelectMeeting?: (meetingId: string) => void;
}

export default function MeetingList({ projectId, onSelectMeeting }: MeetingListProps) {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, [projectId]);

  const loadMeetings = async () => {
    try {
      const response = await meetingsAPI.getByProject(projectId);
      setMeetings(response.data.data || []);
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate PRD');
    }
  };

  const handleGenerateAssignments = async (meetingId: string) => {
    try {
      await meetingsAPI.generateAssignments(meetingId);
      toast.success('Assignment generation started');
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
        meetings.map((meeting) => (
          <div
            key={meeting._id}
            className="border border-border-default rounded-xl p-4 hover:border-primary-main transition-all bg-background-secondary"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-text-heading mb-2">{meeting.title}</h3>
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
                  <p className="text-sm text-text-body mb-3">{meeting.summary}</p>
                )}
              </div>
            </div>
            {meeting.transcriptId && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
                <button
                  onClick={() => handleGeneratePRD(meeting._id)}
                  className="px-3 py-1.5 text-sm bg-primary-main text-white rounded-lg hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate PRD
                </button>
                <button
                  onClick={() => handleGenerateAssignments(meeting._id)}
                  className="px-3 py-1.5 text-sm bg-primary-main text-white rounded-lg hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Assignments
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

