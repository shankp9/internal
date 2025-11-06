'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { assignmentsAPI, projectsAPI, developersAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Check, X as XIcon, Edit, Trash2, FileText, Eye } from 'lucide-react';
import AssignmentModal from '@/components/assignments/AssignmentModal';
import TaskBreakdownViewer from '@/components/assignments/TaskBreakdownViewer';

export default function AssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [filter, setFilter] = useState({ status: '', projectId: '', developerId: '' });
  const [taskBreakdownModalOpen, setTaskBreakdownModalOpen] = useState(false);
  const [selectedTaskBreakdown, setSelectedTaskBreakdown] = useState<{ assignmentId: string; markdown: string | null } | null>(null);
  const [loadingTaskBreakdown, setLoadingTaskBreakdown] = useState(false);
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated()) {
      loadAssignments();
    }
  }, [filter]);

  const loadAssignments = async () => {
    try {
      const params: any = {};
      if (filter.status) params.status = filter.status;
      if (filter.projectId) params.projectId = filter.projectId;
      if (filter.developerId) params.developerId = filter.developerId;

      const response = await assignmentsAPI.getAll(params);
      setAssignments(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAssignment(null);
    setModalOpen(true);
  };

  const handleEdit = (assignment: any) => {
    setSelectedAssignment(assignment);
    setModalOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      await assignmentsAPI.approve(id);
      toast.success('Assignment approved successfully');
      loadAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve assignment');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await assignmentsAPI.reject(id, reason);
      toast.success('Assignment rejected');
      loadAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await assignmentsAPI.delete(id);
      toast.success('Assignment deleted successfully');
      loadAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedAssignment(null);
    loadAssignments();
  };

  const handleViewTaskBreakdown = async (assignmentId: string) => {
    setLoadingTaskBreakdown(true);
    setSelectedTaskBreakdown({ assignmentId, markdown: null });
    setTaskBreakdownModalOpen(true);
    try {
      const response = await assignmentsAPI.getTaskBreakdown(assignmentId);
      const breakdownData = response.data.data;
      const markdown = breakdownData && breakdownData.markdown && breakdownData.markdown.trim() !== ''
        ? breakdownData.markdown
        : null;
      setSelectedTaskBreakdown({ assignmentId, markdown });
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load task breakdown');
      }
      setSelectedTaskBreakdown({ assignmentId, markdown: null });
    } finally {
      setLoadingTaskBreakdown(false);
    }
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-main"></div>
            <p className="text-sm text-text-muted">Loading assignments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const canApprove = user?.role === 'admin';

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-heading">Assignments</h1>
            <p className="text-sm text-text-muted mt-1">Manage developer assignments to projects</p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-primary-main to-primary-hover text-white rounded-xl hover:from-primary-hover hover:to-primary-main/90 transition-all shadow-soft hover:shadow-medium font-medium w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Add Assignment</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-background-primary rounded-xl shadow-soft border border-border-light p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-heading mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-heading mb-2">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-heading mb-2">Project</label>
              <input
                type="text"
                value={filter.projectId}
                onChange={(e) => setFilter({ ...filter, projectId: e.target.value })}
                placeholder="Project ID"
                className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-heading mb-2">Developer</label>
              <input
                type="text"
                value={filter.developerId}
                onChange={(e) => setFilter({ ...filter, developerId: e.target.value })}
                placeholder="Developer ID"
                className="w-full px-4 py-3 border border-border-default rounded-xl focus:ring-2 focus:ring-primary-main focus:border-primary-main outline-none transition-all bg-background-secondary focus:bg-background-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developer
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider hidden md:table-cell">
                    Period
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-text-heading uppercase tracking-wider hidden lg:table-cell">
                    Tags
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12 text-text-light" />
                        <p className="text-text-muted font-medium">No assignments found</p>
                        {canManage && (
                          <button
                            onClick={handleCreate}
                            className="text-sm text-primary-main hover:text-primary-hover font-medium"
                          >
                            Create your first assignment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-background-secondary transition-colors group">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-heading">
                        {assignment.developerId?.name || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-text-body">
                        {assignment.projectId?.name || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border-default rounded-full h-2 max-w-[60px]">
                            <div 
                              className="h-2 rounded-full bg-primary-main"
                              style={{ width: `${Math.min(100, assignment.utilization || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-text-body">{assignment.utilization}%</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-text-body hidden md:table-cell">
                        <div>{new Date(assignment.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-text-light">to {new Date(assignment.endDate).toLocaleDateString()}</div>
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
                              className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-main rounded-lg"
                            >
                              {tag}
                            </span>
                          ))}
                          {assignment.tags?.length > 2 && (
                            <span className="px-2.5 py-1 text-xs font-medium bg-background-secondary text-text-body rounded-lg">
                              +{assignment.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => router.push(`/assignments/${assignment._id}`)}
                            className="p-2 text-primary-main hover:bg-primary-50 rounded-lg transition-all group"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleViewTaskBreakdown(assignment._id)}
                            className="p-2 text-primary-main hover:bg-primary-50 rounded-lg transition-all group"
                            title="View Task Breakdown"
                          >
                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </button>
                          {canManage && (
                            <>
                              {canApprove && assignment.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(assignment._id)}
                                    className="p-2 text-system-active-text hover:bg-system-active-bg rounded-lg transition-all group"
                                    title="Approve"
                                  >
                                    <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(assignment._id)}
                                    className="p-2 text-priority-critical-text hover:bg-priority-critical-bg rounded-lg transition-all group"
                                    title="Reject"
                                  >
                                    <XIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleEdit(assignment)}
                                className="p-2 text-priority-high-text hover:bg-priority-high-bg rounded-lg transition-all group"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => handleDelete(assignment._id)}
                                className="p-2 text-priority-critical-text hover:bg-priority-critical-bg rounded-lg transition-all group"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <AssignmentModal
          assignment={selectedAssignment}
          onClose={handleModalClose}
        />
      )}

      {taskBreakdownModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-background-primary rounded-xl shadow-soft border border-border-light w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h2 className="text-xl font-bold text-text-heading flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Task Breakdown
              </h2>
              <button
                onClick={() => {
                  setTaskBreakdownModalOpen(false);
                  setSelectedTaskBreakdown(null);
                }}
                className="p-2 hover:bg-background-secondary rounded-lg transition-all"
                title="Close"
              >
                <XIcon className="w-5 h-5 text-text-heading" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTaskBreakdown ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-main"></div>
                    <p className="text-sm text-text-muted">Loading task breakdown...</p>
                  </div>
                </div>
              ) : selectedTaskBreakdown?.markdown ? (
                <TaskBreakdownViewer markdown={selectedTaskBreakdown.markdown} />
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-sm">No task breakdown available</p>
                  <p className="text-xs mt-2 text-text-light">Task breakdown will be generated when assignment is created or approved</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
