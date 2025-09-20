import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Files, HardDrive, Download, Upload as UploadIcon } from "lucide-react";

interface UserStats {
  id: number;
  email: string;
  filesCount: number;
  storageUsed: number;
  lastActive: string;
  uploadsThisMonth: number;
  downloadsThisMonth: number;
  deduplicationSavings: number;
}

interface UserAnalyticsProps {
  userEmail: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({ userEmail }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/admin/user-stats?email=${encodeURIComponent(userEmail)}`
        );
        if (!res.ok) throw new Error("Failed to fetch user stats");
        const data: UserStats = await res.json();
        setUserStats(data);
      } catch (err) {
        console.error("❌ Error fetching user stats:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchUserStats();
  }, [userEmail]);

  if (loading) {
    return <div className="text-gray-400">Loading your analytics...</div>;
  }

  if (!userStats) {
    return <div className="text-gray-400">No stats available for {userEmail}</div>;
  }

  // TODO: Replace with real breakdown from backend later
  const fileTypeDistribution = [
    { type: "Images", count: 10, size: 500 * 1024 * 1024 },
    { type: "Documents", count: 5, size: 300 * 1024 * 1024 },
    { type: "Videos", count: 2, size: 1200 * 1024 * 1024 },
  ];

  // TODO: Replace with real time series (uploads/downloads per day)
  const activityHistory = [
    { date: "2025-09-01", uploads: 3, downloads: 5 },
    { date: "2025-09-02", uploads: 7, downloads: 2 },
    { date: "2025-09-03", uploads: 2, downloads: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Personal Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">My Files</p>
              <p className="text-2xl font-bold text-white">{userStats.filesCount}</p>
            </div>
            <Files className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatFileSize(userStats.storageUsed)}</p>
              <p className="text-xs text-green-400 mt-1">
                {formatFileSize(userStats.deduplicationSavings)} saved
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Uploads This Month</p>
              <p className="text-2xl font-bold text-white">{userStats.uploadsThisMonth}</p>
            </div>
            <UploadIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Downloads This Month</p>
              <p className="text-2xl font-bold text-white">{userStats.downloadsThisMonth}</p>
            </div>
            <Download className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Type Distribution */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">File Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fileTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
              >
                {fileTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#F9FAFB",
                }}
                formatter={(value: number) => [value, "Files"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activity History */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Activity History</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#F9FAFB",
                }}
              />
              <Line type="monotone" dataKey="uploads" stroke="#10B981" strokeWidth={2} dot />
              <Line type="monotone" dataKey="downloads" stroke="#3B82F6" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Storage Breakdown by File Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fileTypeDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="type" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatFileSize} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F9FAFB",
              }}
              formatter={(value: number) => [formatFileSize(value), "Storage Used"]}
            />
            <Bar dataKey="size" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
