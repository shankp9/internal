'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { developersAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { User, Briefcase, TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function DeveloperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const developerId = params?.id as string;

  useEffect(() => {
    if (isAuthenticated() && developerId) {
      loadDeveloper();
    }
  }, [developerId]);

  const loadDeveloper = async () => {
    if (!developerId) return;

    try {
      const response = await developersAPI.getById(developerId);
      setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load developer details');
      if (error.response?.status === 404) {
        router.push('/developers');
      }
    } finally {
      setLoading(false);
    }
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
          Developer not found
        </div>
      </Layout>
    );
  }

  const historyData = data.utilizationHistory?.map((item: any) => ({
    week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    utilization: Math.round(item.utilization),
  })) || [];

  const activeAssignments = data.assignments?.filter((a: any) => {
    const now = new Date();
    return a.status === 'approved' && 
           new Date(a.startDate) <= now && 
           new Date(a.endDate) >= now;
  }) || [];

  const allAssignments = data.assignments || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/developers')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{data.email}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Utilization</p>
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
                <p className="text-sm text-gray-600">Available Capacity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {Math.round(data.availableCapacity || 0)}%
                </p>
              </div>
              <Briefcase className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Assignments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {activeAssignments.length}
                </p>
              </div>
              <User className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-2xl font-bold mt-2 ${
                  data.isOverUtilized ? 'text-red-600' : 
                  data.totalUtilization > 80 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {data.isOverUtilized ? 'Over-utilized' : 
                   data.totalUtilization > 80 ? 'High' : 
                   'Available'}
                </p>
              </div>
              {data.isOverUtilized && (
                <AlertTriangle className="w-12 h-12 text-red-600" />
              )}
            </div>
          </div>
        </div>

        {/* Developer Info */}
        {(data.managerId || data.skills?.length > 0) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Developer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.managerId && (
                <div>
                  <p className="text-sm text-gray-600">Manager</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {data.managerId.name || data.managerId}
                  </p>
                </div>
              )}
              {data.skills && data.skills.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Utilization History Chart */}
        {historyData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Utilization History (Last 12 Weeks)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="utilization" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  name="Utilization %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* All Assignments */}
        {allAssignments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Assignments</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAssignments.map((assignment: any) => (
                    <tr key={assignment._id || assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {assignment.projectId?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.utilization}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assignment.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          assignment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {assignment.tags?.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


