'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { assignmentsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Edit, Loader2, RefreshCw, FileText, User, Calendar, Briefcase, Tag, Sparkles, Lightbulb, AlertCircle } from 'lucide-react';
import TaskBreakdownViewer from '@/components/assignments/TaskBreakdownViewer';
import TaskBreakdownEditor from '@/components/assignments/TaskBreakdownEditor';
import TaskBreakdownView from '@/components/assignments/TaskBreakdownView';

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [taskBreakdown, setTaskBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const assignmentId = params?.id as string;
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated() && assignmentId) {
      loadAssignment();
      loadTaskBreakdown();
    }
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      const response = await assignmentsAPI.getById(assignmentId);
      setAssignment(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load assignment');
      if (error.response?.status === 404) {
        router.push('/assignments');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTaskBreakdown = async () => {
    try {
      const response = await assignmentsAPI.getTaskBreakdown(assignmentId);
      const breakdownData = response.data.data;
      // Check if markdown is actually empty/null
      if (breakdownData && (!breakdownData.markdown || breakdownData.markdown.trim() === '')) {
        setTaskBreakdown(null); // Set to null if empty so Generate button shows
      } else {
        setTaskBreakdown(breakdownData);
      }
    } catch (error: any) {
      // If breakdown doesn't exist, that's okay
      if (error.response?.status !== 404) {
        console.error('Failed to load task breakdown:', error);
      }
      setTaskBreakdown(null); // Ensure it's null if there's an error
    }
  };

  const handleGenerateBreakdown = async () => {
    setGenerating(true);
    try {
      const response = await assignmentsAPI.generateTaskBreakdown(assignmentId);
      setTaskBreakdown(response.data.data);
      toast.success('Task breakdown generated successfully');
      loadAssignment(); // Refresh assignment data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate task breakdown');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveBreakdown = async (markdown: string) => {
    await assignmentsAPI.updateTaskBreakdown(assignmentId, markdown);
    setTaskBreakdown({
      ...taskBreakdown,
      markdown,
      lastUpdated: new Date().toISOString(),
    });
    setEditing(false);
    loadAssignment(); // Refresh assignment data
  };

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary-main animate-spin" />
            <p className="text-sm text-text-muted">Loading assignment...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!assignment) {
    return (
      <Layout>
        <div className="text-center py-12 text-text-muted">
          Assignment not found
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-system-active-bg text-system-active-text';
      case 'rejected':
        return 'bg-priority-critical-bg text-priority-critical-text';
      case 'pending':
        return 'bg-priority-medium-bg text-priority-medium-text';
      default:
        return 'bg-background-secondary text-text-body';
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/assignments')}
              className="p-2 hover:bg-background-secondary rounded-lg transition-all"
              title="Back to assignments"
            >
              <ArrowLeft className="w-5 h-5 text-text-heading" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-heading">Assignment Details</h1>
                {assignment.suggestionSource === 'ai-generated' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-lg text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI-Generated
                  </span>
                )}
              </div>
              <p className="text-sm text-text-muted mt-1">View and manage assignment information</p>
            </div>
          </div>
        </div>

        {/* AI-Generated Title and Description - Prominent Display */}
        {assignment.suggestionSource === 'ai-generated' && assignment.assignmentSuggestionId && (
          <>
            {assignment.assignmentSuggestionId?.title && (
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-soft border border-primary-500 p-4 sm:p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <p className="text-sm font-semibold opacity-90">AI-Generated Assignment Title</p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {assignment.assignmentSuggestionId.title}
                </h2>
              </div>
            )}

            {assignment.assignmentSuggestionId?.description && (
              <div className="bg-background-primary rounded-xl shadow-soft border border-border-light p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary-main" />
                  <h3 className="text-lg font-bold text-text-heading">Assignment Description</h3>
                  <span className="ml-auto flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-main rounded text-xs font-semibold">
                    <Sparkles className="w-3 h-3" />
                    AI-Generated
                  </span>
                </div>
                <p className="text-base text-text-body leading-relaxed whitespace-pre-wrap">
                  {assignment.assignmentSuggestionId.description}
                </p>
              </div>
            )}
          </>
        )}

        {/* Assignment Information */}
        <div className="bg-background-primary rounded-xl shadow-soft border border-border-light p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-text-muted" />
                <p className="text-sm font-semibold text-text-heading">Developer</p>
              </div>
              <p className="text-lg font-semibold text-text-body">{assignment.developerId?.name || 'N/A'}</p>
              {assignment.developerId?.email && (
                <p className="text-sm text-text-muted mt-1">{assignment.developerId.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-text-muted" />
                <p className="text-sm font-semibold text-text-heading">Project</p>
              </div>
              <p className="text-lg font-semibold text-text-body">{assignment.projectId?.name || 'N/A'}</p>
              {assignment.projectId?.clientId?.name && (
                <p className="text-sm text-text-muted mt-1">Client: {assignment.projectId.clientId.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-text-muted" />
                <p className="text-sm font-semibold text-text-heading">Period</p>
              </div>
              <p className="text-lg font-semibold text-text-body">
                {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-text-muted" />
                <p className="text-sm font-semibold text-text-heading">Utilization</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-border-default rounded-full h-3 max-w-[200px]">
                  <div
                    className="h-3 rounded-full bg-primary-main transition-all"
                    style={{ width: `${Math.min(100, assignment.utilization || 0)}%` }}
                  ></div>
                </div>
                <span className="text-lg font-semibold text-text-body">{assignment.utilization}%</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-text-heading mb-2">Status</p>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                {assignment.status}
              </span>
            </div>

            {assignment.suggestionSource === 'ai-generated' && assignment.assignmentSuggestionId?.priority && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-text-muted" />
                  <p className="text-sm font-semibold text-text-heading">Priority</p>
                </div>
                <span className={`inline-block px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  assignment.assignmentSuggestionId.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  assignment.assignmentSuggestionId.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  assignment.assignmentSuggestionId.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {assignment.assignmentSuggestionId.priority.charAt(0).toUpperCase() + assignment.assignmentSuggestionId.priority.slice(1)}
                </span>
              </div>
            )}

            {assignment.suggestionSource === 'ai-generated' && assignment.assignmentSuggestionId?.meetingId && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-text-muted" />
                  <p className="text-sm font-semibold text-text-heading">Source Meeting</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-body">{assignment.assignmentSuggestionId.meetingId?.title || 'Meeting'}</p>
                  {assignment.assignmentSuggestionId.meetingId?.date && (
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(assignment.assignmentSuggestionId.meetingId.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {assignment.developerId?.skills && assignment.developerId.skills.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-text-muted" />
                  <p className="text-sm font-semibold text-text-heading">Developer Skills</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignment.developerId.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-main rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {assignment.tags && assignment.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-5 h-5 text-text-muted" />
                  <p className="text-sm font-semibold text-text-heading">Tags</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignment.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-main rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {assignment.submittedBy && (
              <div>
                <p className="text-sm font-semibold text-text-heading mb-2">Submitted By</p>
                <p className="text-sm text-text-body">{assignment.submittedBy?.name || 'N/A'}</p>
                {assignment.submittedBy?.email && (
                  <p className="text-xs text-text-muted mt-1">{assignment.submittedBy.email}</p>
                )}
                {assignment.createdAt && (
                  <p className="text-xs text-text-muted mt-1">
                    Created: {new Date(assignment.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {assignment.approvedBy && (
              <div>
                <p className="text-sm font-semibold text-text-heading mb-2">Approved By</p>
                <p className="text-sm text-text-body">{assignment.approvedBy?.name || 'N/A'}</p>
                {assignment.approvedBy?.email && (
                  <p className="text-xs text-text-muted mt-1">{assignment.approvedBy.email}</p>
                )}
                {assignment.approvedAt && (
                  <p className="text-xs text-text-muted mt-1">
                    Approved: {new Date(assignment.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Task Breakdown Section */}
        <div className="bg-background-primary rounded-xl shadow-soft border border-border-light p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-heading flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Task Breakdown
              </h2>
              <p className="text-sm text-text-muted mt-1">Detailed instructions and requirements for this assignment</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !editing && (
                <>
                  {(!taskBreakdown?.markdown || taskBreakdown.markdown.trim() === '') && (
                    <button
                      onClick={handleGenerateBreakdown}
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-main text-white rounded-lg hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Generate Task Breakdown
                        </>
                      )}
                    </button>
                  )}
                  {taskBreakdown?.markdown && taskBreakdown.markdown.trim() !== '' && (
                    <>
                      <button
                        onClick={handleGenerateBreakdown}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-text-heading border border-border-default rounded-lg hover:bg-background-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        title="Regenerate task breakdown"
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-main text-white rounded-lg hover:bg-primary-hover transition-all text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    </>
                  )}
                </>
              )}
              {!canEdit && (!taskBreakdown?.markdown || taskBreakdown.markdown.trim() === '') && (
                <p className="text-sm text-text-muted italic">Task breakdown will be generated by manager/admin</p>
              )}
            </div>
          </div>

          {/* Structured Task Breakdown */}
          {(assignment.taskBreakdown || assignment.assignmentSuggestionId?.taskBreakdown) && (
            <div className="mb-6 pb-6 border-b border-border-default">
              <h3 className="text-lg font-bold text-text-heading mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-main" />
                Structured Task Breakdown
              </h3>
              <div className="bg-background-secondary rounded-lg p-4 border border-border-default">
                <TaskBreakdownView 
                  taskBreakdown={assignment.taskBreakdown || assignment.assignmentSuggestionId?.taskBreakdown} 
                />
              </div>
            </div>
          )}

          {/* Task Breakdown Content */}
          {editing && canEdit ? (
            <TaskBreakdownEditor
              markdown={taskBreakdown?.markdown || ''}
              onSave={handleSaveBreakdown}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              {taskBreakdown?.markdown && taskBreakdown.markdown.trim() !== '' && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-text-heading mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-main" />
                    Detailed Task Breakdown (Markdown)
                  </h3>
                </div>
              )}
              <TaskBreakdownViewer
                markdown={taskBreakdown?.markdown || ''}
                loading={generating}
              />
            </>
          )}

          {/* Metadata */}
          {taskBreakdown && (taskBreakdown.generatedAt || taskBreakdown.lastUpdated) && (
            <div className="mt-4 pt-4 border-t border-border-default text-xs text-text-muted">
              {taskBreakdown.generatedAt && (
                <p>Generated: {new Date(taskBreakdown.generatedAt).toLocaleString()}</p>
              )}
              {taskBreakdown.lastUpdated && (
                <p>Last updated: {new Date(taskBreakdown.lastUpdated).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

