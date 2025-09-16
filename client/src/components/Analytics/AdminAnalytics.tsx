import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  HardDrive, 
  Files, 
  Download, 
  Upload as UploadIcon,
} from 'lucide-react';

interface UserStats {
  id: string;
  email: string;
  filesCount: number;
  storageUsed: number;
  lastActive: string;
  uploadsThisMonth: number;
  downloadsThisMonth: number;
}

interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  activeUsers: number;
  uploadsToday: number;
  downloadsToday: number;
  deduplicationSavings: number;
}

interface AdminAnalyticsProps {
  userStats: UserStats[];
  systemStats: SystemStats;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  userStats,
  systemStats
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Prepare data for charts
  const storageByUser = userStats
    .sort((a, b) => b.storageUsed - a.storageUsed)
    .slice(0, 10)
    .map(user => ({
      name: user.email.split('@')[0],
      storage: user.storageUsed,
      files: user.filesCount
    }));

  const activityData = userStats.map(user => ({
    name: user.email.split('@')[0],
    uploads: user.uploadsThisMonth,
    downloads: user.downloadsThisMonth
  }));

  const storageDistribution = [
    { name: 'Used Storage', value: systemStats.totalStorage - systemStats.deduplicationSavings },
    { name: 'Saved by Deduplication', value: systemStats.deduplicationSavings }
  ];

  // Mock time series data for trends
  const trendData = [
    { date: '2024-01', users: 45, files: 1200, storage: 2.1 },
    { date: '2024-02', users: 52, files: 1450, storage: 2.8 },
    { date: '2024-03', users: 61, files: 1680, storage: 3.2 },
    { date: '2024-04', users: 68, files: 1920, storage: 3.9 },
    { date: '2024-05', users: 75, files: 2150, storage: 4.3 },
    { date: '2024-06', users: 82, files: 2380, storage: 4.8 }
  ];

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-white">{systemStats.totalUsers}</p>
              <p className="text-xs text-green-400 mt-1">
                {systemStats.activeUsers} active today
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Files</p>
              <p className="text-2xl font-bold text-white">{systemStats.totalFiles.toLocaleString()}</p>
              <p className="text-xs text-blue-400 mt-1">
                +{systemStats.uploadsToday} today
              </p>
            </div>
            <Files className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatFileSize(systemStats.totalStorage)}</p>
              <p className="text-xs text-purple-400 mt-1">
                {formatFileSize(systemStats.deduplicationSavings)} saved
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Downloads Today</p>
              <p className="text-2xl font-bold text-white">{systemStats.downloadsToday}</p>
              <p className="text-xs text-orange-400 mt-1">
                Activity trending up
              </p>
            </div>
            <Download className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage by User */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Users by Storage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storageByUser}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={formatFileSize}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number, name: string) => [
                  name === 'storage' ? formatFileSize(value) : value,
                  name === 'storage' ? 'Storage Used' : 'Files'
                ]}
              />
              <Bar dataKey="storage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Activity This Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="uploads" fill="#10B981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="downloads" fill="#F59E0B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Distribution */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={storageDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {storageDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number) => formatFileSize(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {storageDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-300">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {formatFileSize(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Trends */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Growth Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stackId="1"
                stroke="#3B82F6" 
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="files" 
                stackId="2"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Details Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">User Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Storage Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {userStats.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.filesCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatFileSize(user.storageUsed)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex space-x-4">
                      <span className="flex items-center">
                        <UploadIcon className="w-3 h-3 mr-1 text-green-400" />
                        {user.uploadsThisMonth}
                      </span>
                      <span className="flex items-center">
                        <Download className="w-3 h-3 mr-1 text-blue-400" />
                        {user.downloadsThisMonth}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};