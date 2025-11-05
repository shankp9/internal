'use client';

import { useEffect, useState } from 'react';
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { Users, FileText, Clock, Briefcase, TrendingUp, Zap, Target, Activity, AlertTriangle, Lightbulb } from 'lucide-react';

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

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardAPI.manager();
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
          <Clock className="w-16 h-16 text-text-light mx-auto mb-4" />
          <p className="text-text-muted font-medium">No data available</p>
        </div>
      </div>
    );
  }

  const teamUtilizationData = data.teamUtilization?.map((member: any) => ({
    name: member.name.split(' ')[0], // First name only
    utilization: Math.round(member.utilization),
    available: Math.round(member.availableCapacity),
  })) || [];

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
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Team Members</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-primary-main transition-colors">
                {data.totalTeamMembers}
              </p>
              {data.capacityDistribution && (
                <p className="text-xs text-text-muted mt-1">
                  {data.capacityDistribution.low} available
                </p>
              )}
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
                {Math.round(data.averageUtilization || 0)}%
              </p>
              {data.averageAvailableCapacity && (
                <p className="text-xs text-text-muted mt-1">
                  {Math.round(data.averageAvailableCapacity)}% avg available
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-system-active-bg to-system-active-bg/80 p-3 rounded-xl group-hover:from-system-active-bg/90 group-hover:to-system-active-bg transition-all">
              <Activity className="w-8 h-8 text-system-active-text" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Pending Approvals</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-priority-high-text transition-colors">
                {data.pendingApprovals?.length || 0}
              </p>
              <p className="text-xs text-text-muted mt-1">Requires action</p>
            </div>
            <div className="bg-gradient-to-br from-priority-high-bg to-priority-high-bg/80 p-3 rounded-xl group-hover:from-priority-high-bg/90 group-hover:to-priority-high-bg transition-all">
              <FileText className="w-8 h-8 text-priority-high-text" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Upcoming Availability</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-green-600 transition-colors">
                {data.upcomingAvailability?.length || 0}
              </p>
              {data.capacityForecast && data.capacityForecast.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  {data.capacityForecast[0].availableDevelopers} available in 30 days
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:from-green-200 group-hover:to-green-300 transition-all">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Capacity Insights */}
      {data.capacityDistribution && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Low Utilization</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {data.capacityDistribution.low}
            </p>
            <p className="text-xs text-text-muted mt-1">Team members (&lt;50%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Medium Utilization</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {data.capacityDistribution.medium}
            </p>
            <p className="text-xs text-text-muted mt-1">Team members (50-80%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">High Utilization</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {data.capacityDistribution.high}
            </p>
            <p className="text-xs text-text-muted mt-1">Team members (80-100%)</p>
          </div>
          <div className="bg-background-primary rounded-xl shadow-soft p-4 border border-border-light">
            <p className="text-sm font-medium text-text-muted">Over-utilized</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {data.capacityDistribution.over}
            </p>
            <p className="text-xs text-text-muted mt-1">Team members (&gt;100%)</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Utilization Chart */}
        {teamUtilizationData.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-main" />
              Team Utilization
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
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
                <Bar dataKey="utilization" fill="#00B2A1" name="Utilization %" radius={[8, 8, 0, 0]} />
                <Bar dataKey="available" fill="#10b981" name="Available %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Capacity Forecast */}
        {data.capacityForecast && data.capacityForecast.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-main" />
              Capacity Forecast
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.capacityForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="days" 
                  stroke="#6b7280"
                  label={{ value: 'Days Ahead', position: 'insideBottom', offset: -5 }}
                />
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
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
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
            <div className="mt-4 grid grid-cols-3 gap-3">
              {data.capacityForecast.map((forecast: any, idx: number) => (
                <div key={idx} className="bg-background-secondary rounded-lg p-3">
                  <p className="text-xs font-medium text-text-muted">{forecast.days} days</p>
                  <p className="text-lg font-bold text-text-heading mt-1">
                    {Math.round(forecast.averageUtilization)}%
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {forecast.availableDevelopers} available
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skills Matrix */}
      {data.skillsMatrix && data.skillsMatrix.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-main" />
            Team Skills & Capacity
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-primary-50 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Skill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Team Members
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

      {/* Pending Approvals */}
      {data.pendingApprovals && data.pendingApprovals.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-priority-high-bg border-l-4 border-l-priority-high-text">
          <div className="flex items-center space-x-2 mb-6">
            <div className="bg-priority-high-bg p-2 rounded-lg">
              <FileText className="w-6 h-6 text-priority-high-text" />
            </div>
            <h2 className="text-xl font-bold text-text-heading">Pending Approvals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light">
              <thead className="bg-gradient-to-r from-priority-high-bg/30 to-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.pendingApprovals.map((approval: any) => (
                  <tr key={approval._id} className="hover:bg-priority-high-bg/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {approval.developerId?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {approval.projectId?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-body">
                      {approval.utilization}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {new Date(approval.startDate).toLocaleDateString()} - {new Date(approval.endDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects Breakdown */}
      {data.projectsBreakdown && data.projectsBreakdown.length > 0 && (
        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
          <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-main" />
            Projects Breakdown
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
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-heading uppercase tracking-wider">
                    Developers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background-primary divide-y divide-border-light">
                {data.projectsBreakdown.map((project: any) => (
                  <tr key={project.id} className="hover:bg-background-secondary transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-heading">
                      {project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {project.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                          <div 
                            className={`h-2 rounded-full ${
                              project.utilization > 80 ? 'bg-red-500' :
                              project.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, project.utilization)}%` }}
                          ></div>
                        </div>
                        <span>{Math.round(project.utilization)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-body">
                      {project.developerCount}
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
