'use client';

import { useEffect, useState } from 'react';
import { developersAPI } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
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
  AreaChart,
  Area,
} from 'recharts';
import { User, Briefcase, TrendingUp, AlertTriangle, Calendar, Clock, Zap, Target, CheckCircle, Activity } from 'lucide-react';

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

export default function EmployeeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    if (!user) return;
    
    try {
      const response = await developersAPI.getById(user.id);
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

  const upcomingAssignments = data.upcomingAssignments || [];
  const futureCapacityForecast = data.futureCapacityForecast || [];
  const assignmentsEndingSoon = data.assignmentsEndingSoon || [];
  const nextAvailableDate = data.nextAvailableDate;

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
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Current Utilization</p>
              <p className={`text-3xl font-bold mt-2 group-hover:text-primary-main transition-colors ${
                data.totalUtilization > 100 ? 'text-red-600' : 
                data.totalUtilization > 80 ? 'text-yellow-600' : 
                'text-text-heading'
              }`}>
                {Math.round(data.totalUtilization || 0)}%
              </p>
              <p className="text-xs text-text-muted mt-1">
                {activeAssignments.length} active projects
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-3 rounded-xl group-hover:from-primary-200 group-hover:to-primary-300 transition-all">
              <Activity className="w-8 h-8 text-primary-main" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Available Capacity</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-green-600 transition-colors">
                {Math.round(data.availableCapacity || 0)}%
              </p>
              {nextAvailableDate && (
                <p className="text-xs text-text-muted mt-1">
                  Next availability: {new Date(nextAvailableDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 p-3 rounded-xl group-hover:from-green-200 group-hover:to-green-300 transition-all">
              <Briefcase className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Upcoming Assignments</p>
              <p className="text-3xl font-bold text-text-heading mt-2 group-hover:text-blue-600 transition-colors">
                {upcomingAssignments.length}
              </p>
              {upcomingAssignments.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  Starting soon
                </p>
              )}
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-3 rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light hover:shadow-medium transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide">Status</p>
              <p className={`text-2xl font-bold mt-2 transition-colors ${
                data.isOverUtilized ? 'text-red-600' : 
                data.totalUtilization > 80 ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {data.isOverUtilized ? 'Over-utilized' : 
                 data.totalUtilization > 80 ? 'High' : 
                 'Available'}
              </p>
              {assignmentsEndingSoon.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  {assignmentsEndingSoon.length} ending soon
                </p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${
              data.isOverUtilized ? 'bg-red-100' : 
              data.totalUtilization > 80 ? 'bg-yellow-100' : 
              'bg-green-100'
            }`}>
              {data.isOverUtilized ? (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-soft p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-blue-900">Upcoming Availability</h3>
          </div>
          <div className="space-y-3">
            {assignmentsEndingSoon.length > 0 ? (
              assignmentsEndingSoon.slice(0, 3).map((assignment: any, idx: number) => (
                <div key={idx} className="bg-white/70 rounded-lg p-3">
                  <p className="font-medium text-blue-900">{assignment.projectId?.name || 'Project'}</p>
                  <p className="text-sm text-blue-700">
                    Ends: {new Date(assignment.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {assignment.utilization}% capacity will be freed
                  </p>
                </div>
              ))
            ) : (
              <p className="text-blue-800">No assignments ending in the next 30 days</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-soft p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-green-900">Capacity Forecast</h3>
          </div>
          <div className="space-y-2 text-sm text-green-800">
            {futureCapacityForecast.length > 0 ? (
              <>
                <p>• Next week: {Math.round(futureCapacityForecast[0].utilization || 0)}% utilization</p>
                <p>• Next month: {Math.round(futureCapacityForecast[3]?.utilization || 0)}% utilization</p>
                <p>• Available capacity: {Math.round(futureCapacityForecast[0].availableCapacity || 0)}%</p>
                {futureCapacityForecast.some((f: any) => f.isOverUtilized) && (
                  <p className="text-red-700 font-semibold">⚠️ Over-utilization detected in future weeks</p>
                )}
              </>
            ) : (
              <p>No forecast data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization History Chart */}
        {historyData.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-main" />
              Utilization History (Last 12 Weeks)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="utilization" 
                  stroke="#00B2A1" 
                  strokeWidth={2}
                  name="Utilization %"
                />
                <Line 
                  type="monotone" 
                  dataKey="100" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  name="100% Limit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Future Capacity Forecast */}
        {futureCapacityForecast.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-main" />
              Future Capacity Forecast (Next 12 Weeks)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={futureCapacityForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="week" 
                  stroke="#6b7280"
                  label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
                />
                <YAxis domain={[0, 100]} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(value) => `Week ${value}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="utilization" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.6}
                  name="Utilization %"
                />
                <Area 
                  type="monotone" 
                  dataKey="availableCapacity" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Available Capacity %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Active and Upcoming Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Assignments */}
        {activeAssignments.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-main" />
              Active Assignments
            </h2>
            <div className="space-y-4">
              {activeAssignments.map((assignment: any) => (
                <div key={assignment._id} className="bg-background-secondary rounded-lg p-4 border border-border-light hover:shadow-soft transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-heading">{assignment.projectId?.name || 'N/A'}</h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-text-muted">
                        <span>{assignment.utilization}% utilization</span>
                        <span>•</span>
                        <span>Ends: {new Date(assignment.endDate).toLocaleDateString()}</span>
                      </div>
                      {assignment.tags && assignment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assignment.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`w-2 h-12 rounded-full ${
                      assignment.utilization > 80 ? 'bg-red-500' :
                      assignment.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Assignments */}
        {upcomingAssignments.length > 0 && (
          <div className="bg-background-primary rounded-xl shadow-soft p-6 border border-border-light">
            <h2 className="text-xl font-bold text-text-heading mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-main" />
              Upcoming Assignments
            </h2>
            <div className="space-y-4">
              {upcomingAssignments.slice(0, 5).map((assignment: any) => (
                <div key={assignment._id} className="bg-background-secondary rounded-lg p-4 border border-border-light hover:shadow-soft transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-heading">{assignment.projectId?.name || 'N/A'}</h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-text-muted">
                        <span>{assignment.utilization}% utilization</span>
                        <span>•</span>
                        <span>Starts: {new Date(assignment.startDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-2">
                        {Math.ceil((new Date(assignment.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days until start
                      </p>
                    </div>
                    <div className="bg-blue-100 w-2 h-12 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
