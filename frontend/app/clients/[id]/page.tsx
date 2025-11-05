'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated, getStoredUser } from '@/lib/auth';
import { clientsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { 
  Building2, Users, Calendar, Briefcase, ArrowLeft, 
  CheckCircle, Clock, XCircle, TrendingUp, User
} from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const clientId = params?.id as string;
  const user = getStoredUser();

  useEffect(() => {
    if (isAuthenticated() && clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    if (!clientId) return;

    try {
      const response = await clientsAPI.getById(clientId);
      setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load client details');
      if (error.response?.status === 404) {
        router.push('/clients');
      }
    } finally {
      setLoading(false);
    }
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">
          Client not found
        </div>
      </Layout>
    );
  }

  const projects = data.projects || [];
  const allAssignments = data.assignments || [];
  const activeAssignments = allAssignments.filter((a: any) => {
    const now = new Date();
    return a.status === 'approved' && 
           new Date(a.startDate) <= now && 
           new Date(a.endDate) >= now;
  });

  const pendingAssignments = allAssignments.filter((a: any) => a.status === 'pending');
  const approvedAssignments = allAssignments.filter((a: any) => a.status === 'approved');
  
  // Create timeline data - group assignments by month
  const timelineData: { [key: string]: any[] } = {};
  allAssignments.forEach((assignment: any) => {
    const startDate = new Date(assignment.startDate);
    const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    if (!timelineData[monthKey]) {
      timelineData[monthKey] = [];
    }
    timelineData[monthKey].push(assignment);
  });

  // Get unique developers from assignments
  const developers = Array.from(
    new Map(
      allAssignments
        .filter((a: any) => a.developerId)
        .map((a: any) => [a.developerId._id, a.developerId])
    ).values()
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/clients')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {data.industry || 'N/A'} • Account Manager: {data.accountManagerId?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Utilization</p>
                <p className={`text-3xl font-bold mt-2 ${
                  data.totalUtilization > 100 ? 'text-red-600' : 
                  data.totalUtilization > 80 ? 'text-yellow-600' : 
                  'text-gray-900'
                }`}>
                  {Math.round(data.totalUtilization || 0)}%
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {projects.length}
                </p>
              </div>
              <Briefcase className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Resources</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {activeAssignments.length}
                </p>
              </div>
              <Users className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Developers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {developers.length}
                </p>
              </div>
              <User className="w-12 h-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Industry</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {data.industry || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Manager</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {data.accountManagerId?.name || 'N/A'}
              </p>
              {data.accountManagerId?.email && (
                <p className="text-sm text-gray-500 mt-1">{data.accountManagerId.email}</p>
              )}
            </div>
            {data.startDate && (
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatDate(data.startDate)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  data.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects ({projects.length})</h2>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No projects found for this client</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project: any) => (
                <div
                  key={project._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/projects/${project._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <span className="text-sm text-gray-500">
                          {formatDate(project.startDate)} - {formatDate(project.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>Manager: {project.managerId?.name || 'N/A'}</span>
                        <span>•</span>
                        <span>Utilization: {Math.round(project.totalUtilization || 0)}%</span>
                        <span>•</span>
                        <span>Resources: {project.activeAssignmentCount || 0}</span>
                      </div>
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {project.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Assignments</p>
                        <p className="text-lg font-bold text-gray-900">
                          {project.assignments?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resources Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resources & Assignments</h2>
          
          {/* Assignment Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {approvedAssignments.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Approved ({approvedAssignments.length})</h3>
                </div>
                <p className="text-sm text-gray-600">Active assignments</p>
              </div>
            )}

            {pendingAssignments.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Pending ({pendingAssignments.length})</h3>
                </div>
                <p className="text-sm text-gray-600">Awaiting approval</p>
              </div>
            )}
          </div>

          {/* All Assignments Table */}
          {allAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Developer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAssignments.map((assignment: any) => (
                    <tr key={assignment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {assignment.developerId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {assignment.projectId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.utilization}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(assignment.startDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(assignment.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No assignments found for this client</p>
            </div>
          )}
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
          {Object.keys(timelineData).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No timeline data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(timelineData)
                .sort()
                .reverse()
                .map((monthKey) => {
                  const [year, month] = monthKey.split('-');
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  });
                  const monthAssignments = timelineData[monthKey];

                  return (
                    <div key={monthKey} className="border-l-4 border-primary-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{monthName}</h3>
                      <div className="space-y-2">
                        {monthAssignments.map((assignment: any) => (
                          <div
                            key={assignment._id}
                            className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {assignment.developerId?.name || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {assignment.projectId?.name || 'N/A'} • {assignment.utilization}% utilization
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm text-gray-600">
                                  {formatDate(assignment.startDate)} - {formatDate(assignment.endDate)}
                                </p>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                                  {assignment.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

