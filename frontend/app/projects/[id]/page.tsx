'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { projectsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Briefcase, Users, Calendar, CheckCircle, XCircle, Clock, ArrowLeft, Edit, Trash2, FileText, MessageSquare, Sparkles } from 'lucide-react';
import ProjectModal from '@/components/projects/ProjectModal';
import { clientsAPI } from '@/lib/api';
import MeetingModal from '@/components/meetings/MeetingModal';
import MeetingList from '@/components/meetings/MeetingList';
import TranscriptUpload from '@/components/meetings/TranscriptUpload';
import PRDViewer from '@/components/prd/PRDViewer';
import AssignmentSuggestionsPanel from '@/components/assignments/AssignmentSuggestionsPanel';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'meetings' | 'prd' | 'suggestions'>('overview');
  const [meetingListRefreshTrigger, setMeetingListRefreshTrigger] = useState(0);
  const [highlightMeetingId, setHighlightMeetingId] = useState<string | undefined>(undefined);
  const projectId = params?.id as string;
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated() && projectId) {
      loadProject();
      loadClients();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      const response = await projectsAPI.getById(projectId);
      setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load project details');
      if (error.response?.status === 404) {
        router.push('/projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Failed to load clients');
    }
  };

  const handleEdit = () => {
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted successfully');
      router.push('/projects');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    loadProject();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
            <p className="text-sm text-gray-500">Loading project details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="bg-white rounded-xl shadow-soft p-12 text-center border border-gray-100">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Project not found</p>
        </div>
      </Layout>
    );
  }

  const assignments = data.assignments || [];
  const activeAssignments = assignments.filter((a: any) => {
    const now = new Date();
    return a.status === 'approved' && 
           new Date(a.startDate) <= now && 
           new Date(a.endDate) >= now;
  });

  const pendingAssignments = assignments.filter((a: any) => a.status === 'pending');
  const approvedAssignments = assignments.filter((a: any) => a.status === 'approved');
  const rejectedAssignments = assignments.filter((a: any) => a.status === 'rejected');

  const canManage = user?.role === 'admin' || (user?.role === 'manager' && (data.managerId?._id === user.id || data.managerId?._id?.toString() === user.id));

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
              aria-label="Back to projects"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{data.name}</h1>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {data.clientId?.name || 'N/A'} • {data.managerId?.name || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {canManage && (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-soft hover:shadow-medium font-medium flex-1 sm:flex-initial"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-soft hover:shadow-medium font-medium flex-1 sm:flex-initial"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 border border-gray-100 hover:shadow-medium transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Total Utilization</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-2 group-hover:text-primary-600 transition-colors ${
                  data.totalUtilization > 100 ? 'text-red-600' : 
                  data.totalUtilization > 80 ? 'text-yellow-600' : 
                  'text-gray-900'
                }`}>
                  {Math.round(data.totalUtilization || 0)}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-3 rounded-xl group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
                <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-primary-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 border border-gray-100 hover:shadow-medium transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Active Assignments</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-green-600 transition-colors">
                  {activeAssignments.length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:from-green-200 group-hover:to-green-300 transition-all">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 border border-gray-100 hover:shadow-medium transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Assignments</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-yellow-600 transition-colors">
                  {pendingAssignments.length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 p-3 rounded-xl group-hover:from-yellow-200 group-hover:to-yellow-300 transition-all">
                <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 border border-gray-100 hover:shadow-medium transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Total Assignments</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors">
                  {assignments.length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Project Information */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            Project Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Client</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {data.clientId?.name || 'N/A'}
              </p>
              {data.clientId?.industry && (
                <p className="text-sm text-gray-500 mt-1">{data.clientId.industry}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Project Manager</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {data.managerId?.name || 'N/A'}
              </p>
              {data.managerId?.email && (
                <p className="text-sm text-gray-500 mt-1">{data.managerId.email}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {new Date(data.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {new Date(data.endDate).toLocaleDateString()}
              </p>
            </div>
            {data.tags && data.tags.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assignments Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {approvedAssignments.length > 0 && (
            <div className="bg-white rounded-xl shadow-soft border border-green-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Approved ({approvedAssignments.length})</h3>
              </div>
              <div className="space-y-2">
                {approvedAssignments.slice(0, 5).map((assignment: any) => (
                  <div key={assignment._id} className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-gray-900">{assignment.developerId?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{assignment.utilization}% • {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}</p>
                  </div>
                ))}
                {approvedAssignments.length > 5 && (
                  <p className="text-sm text-gray-500">+{approvedAssignments.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {pendingAssignments.length > 0 && (
            <div className="bg-white rounded-xl shadow-soft border border-yellow-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pending ({pendingAssignments.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingAssignments.slice(0, 5).map((assignment: any) => (
                  <div key={assignment._id} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-gray-900">{assignment.developerId?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{assignment.utilization}% • {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}</p>
                  </div>
                ))}
                {pendingAssignments.length > 5 && (
                  <p className="text-sm text-gray-500">+{pendingAssignments.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {rejectedAssignments.length > 0 && (
            <div className="bg-white rounded-xl shadow-soft border border-red-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-red-100 p-2 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Rejected ({rejectedAssignments.length})</h3>
              </div>
              <div className="space-y-2">
                {rejectedAssignments.slice(0, 5).map((assignment: any) => (
                  <div key={assignment._id} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-gray-900">{assignment.developerId?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{assignment.utilization}% • {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}</p>
                    {assignment.rejectionReason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {assignment.rejectionReason}</p>
                    )}
                  </div>
                ))}
                {rejectedAssignments.length > 5 && (
                  <p className="text-sm text-gray-500">+{rejectedAssignments.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'meetings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Meetings
            </button>
            <button
              onClick={() => setActiveTab('prd')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'prd'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              PRD
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'suggestions'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Suggestions
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
        {/* All Assignments Table */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 sm:p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              All Assignments
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Developer
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      Start Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      End Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {assignments.map((assignment: any) => (
                    <tr key={assignment._id || assignment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {assignment.developerId?.name || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                            <div 
                              className="h-2 rounded-full bg-primary-600"
                              style={{ width: `${Math.min(100, assignment.utilization || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{assignment.utilization}%</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {new Date(assignment.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {new Date(assignment.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {assignment.tags?.slice(0, 2).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-lg"
                            >
                              {tag}
                            </span>
                          ))}
                          {assignment.tags?.length > 2 && (
                            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                              +{assignment.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === 'meetings' && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                Meetings
              </h2>
              {canManage && (
                <button
                  onClick={() => setMeetingModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium"
                >
                  Create Meeting
                </button>
              )}
            </div>
            {selectedMeeting ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  ← Back to meetings
                </button>
                <TranscriptUpload
                  meetingId={selectedMeeting}
                  onSuccess={() => {
                    setSelectedMeeting(null);
                    loadProject();
                  }}
                />
              </div>
            ) : (
              <MeetingList
                projectId={projectId}
                onSelectMeeting={setSelectedMeeting}
                refreshTrigger={meetingListRefreshTrigger}
                highlightMeetingId={highlightMeetingId}
              />
            )}
          </div>
        )}

        {activeTab === 'prd' && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 sm:p-6">
            <PRDViewer projectId={projectId} />
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 sm:p-6">
            <AssignmentSuggestionsPanel
              projectId={projectId}
              onRefresh={loadProject}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <ProjectModal
          project={data}
          onClose={handleModalClose}
          clients={clients}
        />
      )}

      {meetingModalOpen && (
        <MeetingModal
          projectId={projectId}
          onClose={() => setMeetingModalOpen(false)}
          onSuccess={(meetingId) => {
            setMeetingModalOpen(false);
            // Switch to meetings tab
            setActiveTab('meetings');
            // Set the meeting ID to highlight
            if (meetingId) {
              setHighlightMeetingId(meetingId);
              // Clear highlight after 3 seconds
              setTimeout(() => {
                setHighlightMeetingId(undefined);
              }, 3000);
            }
            // Refresh meeting list to show the new meeting
            setMeetingListRefreshTrigger((prev) => prev + 1);
            // Also refresh project data
            loadProject();
          }}
        />
      )}
    </Layout>
  );
}

