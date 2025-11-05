'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { developersAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Eye, AlertTriangle, Users } from 'lucide-react';

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      loadDevelopers();
    }
  }, []);

  const loadDevelopers = async () => {
    try {
      const response = await developersAPI.getAll();
      setDevelopers(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load developers');
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Developers</h1>
            <p className="text-sm text-gray-500 mt-1">View developer utilization and capacity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((developer) => (
            <div key={developer._id || developer.id} className="bg-white rounded-xl shadow-soft p-6 border border-gray-100 hover:shadow-medium transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-2 rounded-lg">
                    <Users className="w-6 h-6 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {developer.name}
                    </h3>
                    <p className="text-sm text-gray-500">{developer.email}</p>
                  </div>
                </div>
                {developer.isOverUtilized && (
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Utilization</span>
                    <span className={`text-sm font-bold ${
                      developer.totalUtilization > 100 ? 'text-red-600' :
                      developer.totalUtilization > 80 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {Math.round(developer.totalUtilization || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        developer.totalUtilization > 100 ? 'bg-red-600' :
                        developer.totalUtilization > 80 ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(100, developer.totalUtilization || 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Available Capacity</span>
                    <span className="text-sm font-bold text-blue-600">
                      {Math.round(developer.availableCapacity || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${Math.min(100, developer.availableCapacity || 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Active Assignments</span>
                    <span className="font-bold text-gray-900">{developer.assignmentCount || 0}</span>
                  </div>
                  {developer.manager && (
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600 font-medium">Manager</span>
                      <span className="font-semibold text-gray-900">{developer.manager.name}</span>
                    </div>
                  )}
                  {developer.skills && developer.skills.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {developer.skills.slice(0, 3).map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-lg"
                          >
                            {skill}
                          </span>
                        ))}
                        {developer.skills.length > 3 && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                            +{developer.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <a
                  href={`/developers/${developer._id || developer.id}`}
                  className="block w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-center rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-soft hover:shadow-medium font-medium"
                >
                  View Details
                </a>
              </div>
            </div>
          ))}
        </div>

        {developers.length === 0 && (
          <div className="bg-white rounded-xl shadow-soft p-12 text-center border border-gray-100">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No developers found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
