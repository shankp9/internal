'use client';

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { Users, Briefcase, FileText, AlertTriangle, TrendingUp, Calendar, Target, Zap, Activity, Clock, TrendingDown, Lightbulb } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const getFormattedDate = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardAPI.admin();
      setData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-main"></div>
          <p className="text-sm text-text-muted">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24">
        <div className="bg-background-primary rounded-xl shadow-soft p-8 max-w-md mx-auto">
          <TrendingUp className="w-16 h-16 text-text-light mx-auto mb-4" />
          <p className="text-text-muted font-medium">No data available</p>
        </div>
      </div>
    );
  }

  const utilizationData = (data.utilizationHeatmap || []).slice(0, 10).map((item: any) => ({
    name: item.developer,
    utilization: item.utilization,
  }));

  const lowUtilization = (data.utilizationHeatmap || []).filter((d: any) => d.utilization < 50).length;
  const mediumUtilization = (data.utilizationHeatmap || []).filter((d: any) => d.utilization >= 50 && d.utilization < 80).length;
  const highUtilization = (data.utilizationHeatmap || []).filter((d: any) => d.utilization >= 80 && d.utilization <= 100).length;
  const overUtilization = (data.overbookedDevelopers || []).length;

  const statusData = [
    { name: 'Low (Under 50%)', value: lowUtilization },
    { name: 'Medium (50-80%)', value: mediumUtilization },
    { name: 'High (80-100%)', value: highUtilization },
    { name: 'Over (Above 100%)', value: overUtilization },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-heading">
            {getGreeting()}, {user?.name || 'User'}
          </h1>
          <p className="text-sm text-text-muted mt-1">Data as of: {getFormattedDate()}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Total Developers</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-primary-main transition-colors">
                {data.totalDevelopers}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {data.capacityDistribution?.low || 0} available
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-3 rounded-xl group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
              <Users className="w-8 h-8 text-primary-main" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Average Utilization</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-system-active-text transition-colors">
                {Math.round(data.capacitySummary?.averageUtilization || 0)}%
              </p>
              <p className="text-xs text-text-muted mt-1">
                {data.capacityDistribution?.over || 0} over-utilized
              </p>
            </div>
            <div className="bg-gradient-to-br from-system-active-bg to-system-active-bg/80 p-3 rounded-xl group-hover:from-system-active-bg/90 group-hover:to-system-active-bg transition-all">
              <Activity className="w-8 h-8 text-system-active-text" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Available Capacity</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-primary-main transition-colors">
                {Math.round(data.capacitySummary?.totalAvailable || 0)}%
              </p>
              <p className="text-xs text-text-muted mt-1">
                {data.capacityForecast?.[0]?.totalAvailable ? `${Math.round(data.capacityForecast[0].totalAvailable)}% next month` : 'Forecast available'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-3 rounded-xl group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
              <TrendingDown className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Pending Approvals</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-priority-high-text transition-colors">
                {data.pendingApprovalsCount}
              </p>
              <p className="text-xs text-text-muted mt-1">Requires action</p>
            </div>
            <div className="bg-gradient-to-br from-priority-high-bg to-priority-high-bg/80 p-3 rounded-xl group-hover:from-priority-high-bg/90 group-hover:to-priority-high-bg transition-all">
              <FileText className="w-8 h-8 text-priority-high-text" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-soft p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-blue-900">Capacity Insights</h3>
          </div>
          <div className="space-y-2 text-sm text-blue-800">
            {data.capacityDistribution?.low > 0 && (
              <p>• {data.capacityDistribution.low} developers with low utilization - consider reassignment</p>
            )}
            {data.capacityDistribution?.over > 0 && (
              <p>• {data.capacityDistribution.over} developers over-utilized - urgent attention needed</p>
            )}
            {data.skillsMatrix && data.skillsMatrix.length > 0 && (
              <p>• {data.skillsMatrix.length} skill categories tracked for capacity planning</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-soft p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-green-900">Forecast</h3>
          </div>
          <div className="space-y-2 text-sm text-green-800">
            {data.capacityForecast && data.capacityForecast.length > 0 && (
              <>
                <p>• Next month: {Math.round(data.capacityForecast[0].averageUtilization)}% avg utilization</p>
                <p>• {Math.round(data.capacityForecast[0].totalAvailable)}% capacity available</p>
              </>
            )}
            {data.upcomingAvailabilityTimeline && (
              <p>• {data.upcomingAvailabilityTimeline.length} weeks of availability data</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-soft p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-purple-900">Planning Recommendations</h3>
          </div>
          <div className="space-y-2 text-sm text-purple-800">
            {data.projectsWithCapacity && data.projectsWithCapacity.length > 0 && (
              <p>• {data.projectsWithCapacity.length} active projects need capacity monitoring</p>
            )}
            {data.overbookedDevelopers && data.overbookedDevelopers.length > 0 && (
              <p>• Immediate action: {data.overbookedDevelopers.length} developers need workload adjustment</p>
            )}
            {data.skillsMatrix && data.skillsMatrix.length > 0 && (
              <p>• Review skill gaps in high-demand areas</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-main" />
            Developer Utilization
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend />
              <Bar dataKey="utilization" fill="#00B2A1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-main" />
            Utilization Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overbooked Developers */}
      {data.overbookedDevelopers && data.overbookedDevelopers.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-priority-critical-bg border-l-4 border-l-priority-critical-text">
          <div className="flex items-center space-x-2 mb-6">
            <div className="bg-priority-critical-bg p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-priority-critical-text" />
            </div>
            <h2 className="text-xl font-bold text-text-heading">Overbooked Developers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-priority-critical-bg/30 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Manager
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.overbookedDevelopers.map((dev: any) => (
                  <tr key={dev.id} className="hover:bg-priority-critical-bg/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {dev.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-priority-critical-text font-bold">
                      {Math.round(dev.utilization)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {dev.manager || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capacity Forecast - Next 3 Months */}
      {data.capacityForecast && data.capacityForecast.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-main" />
            Capacity Forecast (Next 3 Months)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.capacityForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="averageUtilization" 
                stroke="#00B2A1" 
                fill="#00B2A1" 
                fillOpacity={0.6}
                name="Avg Utilization %"
              />
              <Area 
                type="monotone" 
                dataKey="totalAvailable" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Available Capacity %"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.capacityForecast.map((forecast: any, idx: number) => (
              <div key={idx} className="bg-background-secondary rounded-lg p-4">
                <p className="text-sm font-medium text-text-muted">{forecast.month}</p>
                <p className="text-2xl font-bold text-text-heading mt-1">
                  {Math.round(forecast.averageUtilization)}%
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Available: {Math.round(forecast.totalAvailable)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Matrix */}
      {data.skillsMatrix && data.skillsMatrix.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-main" />
            Skills Matrix & Capacity by Skill
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Skill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Available Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Avg Utilization
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.skillsMatrix.slice(0, 10).map((skill: any) => (
                  <tr key={skill.skill} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {skill.skill}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {skill.developerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (skill.availableCapacity / skill.totalCapacity) * 100)}%` }}
                          ></div>
                        </div>
                        <span>{Math.round(skill.availableCapacity)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {Math.round(skill.averageUtilization)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming Availability Timeline */}
      {data.upcomingAvailabilityTimeline && data.upcomingAvailabilityTimeline.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-main" />
            Availability Timeline (Next 90 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.upcomingAvailabilityTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="available" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Available (<80%)"
              />
              <Line 
                type="monotone" 
                dataKey="highUtilization" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="High (80-100%)"
              />
              <Line 
                type="monotone" 
                dataKey="overUtilized" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Over-utilized"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projects with Capacity Needs */}
      {data.projectsWithCapacity && data.projectsWithCapacity.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-main" />
            Active Projects - Capacity Overview
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Current Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Next Assignment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.projectsWithCapacity.map((project: any) => (
                  <tr key={project.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {project.client || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div 
                            className={`h-2 rounded-full ${
                              project.currentUtilization > 80 ? 'bg-red-500' :
                              project.currentUtilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, project.currentUtilization)}%` }}
                          ></div>
                        </div>
                        <span>{Math.round(project.currentUtilization)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {project.developerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {project.nextAssignmentDate 
                        ? new Date(project.nextAssignmentDate).toLocaleDateString()
                        : 'None scheduled'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capacity Distribution Summary */}
      {data.capacityDistribution && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Low Utilization</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {data.capacityDistribution.low}
            </p>
            <p className="text-xs text-text-muted mt-1">Developers (&lt;50%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Medium Utilization</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {data.capacityDistribution.medium}
            </p>
            <p className="text-xs text-text-muted mt-1">Developers (50-80%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">High Utilization</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {data.capacityDistribution.high}
            </p>
            <p className="text-xs text-text-muted mt-1">Developers (80-100%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Over-utilized</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {data.capacityDistribution.over}
            </p>
            <p className="text-xs text-text-muted mt-1">Developers (&gt;100%)</p>
          </div>
        </div>
      )}

      {/* Clients Utilization */}
      {data.clientsUtilization && data.clientsUtilization.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-main" />
            Clients Utilization
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Projects
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.clientsUtilization.map((client: any) => (
                  <tr key={client.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {Math.round(client.utilization)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {client.projectCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
