import React, { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { Users, HardDrive, Files, Download } from "lucide-react";

interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  totalUploads: number;
  totalDownloads: number;
  deduplicationSavings: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

export const AdminAnalytics: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:4000/admin/system-stats");
        if (!res.ok) throw new Error("Failed to fetch system stats");
        const sysData = await res.json();
        setSystemStats(sysData);
      } catch (err) {
        console.error("Failed to fetch admin analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <p className="text-gray-300">Loading analytics...</p>;
  if (!systemStats) return <p className="text-red-500">Failed to load system stats</p>;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Storage distribution
  const storageDistribution = [
    { name: "Used Storage", value: systemStats.totalStorage - systemStats.deduplicationSavings },
    { name: "Saved by Deduplication", value: systemStats.deduplicationSavings },
  ];

  // Upload/download ratio
  const uploadDownloadRatio = [
    { name: "Uploads", value: systemStats.totalUploads },
    { name: "Downloads", value: systemStats.totalDownloads },
  ];

  // Trend data (fake time series based on totals)
  const storageTrend = [
    { date: "Day 1", storage: systemStats.totalStorage * 0.6, dedupSaved: systemStats.deduplicationSavings * 0.4 },
    { date: "Day 2", storage: systemStats.totalStorage * 0.7, dedupSaved: systemStats.deduplicationSavings * 0.6 },
    { date: "Day 3", storage: systemStats.totalStorage * 0.8, dedupSaved: systemStats.deduplicationSavings * 0.7 },
    { date: "Day 4", storage: systemStats.totalStorage * 0.9, dedupSaved: systemStats.deduplicationSavings * 0.8 },
    { date: "Day 5", storage: systemStats.totalStorage, dedupSaved: systemStats.deduplicationSavings },
  ];

  const uploadDownloadTrend = [
    { day: "Mon", uploads: Math.floor(systemStats.totalUploads * 0.15), downloads: Math.floor(systemStats.totalDownloads * 0.12) },
    { day: "Tue", uploads: Math.floor(systemStats.totalUploads * 0.18), downloads: Math.floor(systemStats.totalDownloads * 0.14) },
    { day: "Wed", uploads: Math.floor(systemStats.totalUploads * 0.20), downloads: Math.floor(systemStats.totalDownloads * 0.20) },
    { day: "Thu", uploads: Math.floor(systemStats.totalUploads * 0.22), downloads: Math.floor(systemStats.totalDownloads * 0.18) },
    { day: "Fri", uploads: Math.floor(systemStats.totalUploads * 0.25), downloads: Math.floor(systemStats.totalDownloads * 0.22) },
  ];

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-white">{systemStats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Files</p>
              <p className="text-2xl font-bold text-white">{systemStats.totalFiles.toLocaleString()}</p>
              <p className="text-xs text-blue-400 mt-1">{systemStats.totalUploads} uploads</p>
            </div>
            <Files className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-white">{formatFileSize(systemStats.totalStorage)}</p>
              <p className="text-xs text-purple-400 mt-1">{formatFileSize(systemStats.deduplicationSavings)} saved</p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Downloads</p>
              <p className="text-2xl font-bold text-white">{systemStats.totalDownloads}</p>
            </div>
            <Download className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload vs Download Trend */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Uploads vs Downloads</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={uploadDownloadTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line type="monotone" dataKey="uploads" stroke="#3B82F6" />
              <Line type="monotone" dataKey="downloads" stroke="#F59E0B" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Storage efficiency */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Efficiency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={storageDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                {storageDistribution.map((_e, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatFileSize(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Upload/Download Ratio */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload/Download Ratio</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={uploadDownloadRatio} dataKey="value" cx="50%" cy="50%" outerRadius={100}>
                {uploadDownloadRatio.map((_e, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Growth Trend */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Growth Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={storageTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Area type="monotone" dataKey="storage" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="dedupSaved" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
