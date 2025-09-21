import React, { useEffect, useState } from 'react';
import { Trash2, Download, CheckCircle } from 'lucide-react';

interface FileItem {
  id: number;
  name: string;
  size: number;
  hash: string;
  uploadDate: string;
  uploader: string;
  isDeduplicated: boolean;
  refCount: number;
  savings: number;
}

interface DeduplicationGroup {
  hash: string;
  files: FileItem[];
  totalSize: number;
  savedSpace: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const DeduplicationManager: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);

  // 🔹 Fetch files from backend
    useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/user/file-details?username=${encodeURIComponent(userEmail)}`
        );
        if (!res.ok) throw new Error("Failed to fetch files");
        const data: FileItem[] = await res.json();
        setFiles(data);
      } catch (err) {
        console.error("❌ Error fetching user files:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userEmail) fetchFiles();
  }, [userEmail]);

  // 🔹 Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🔹 Group files by hash
  const fileGroups = files.reduce((groups, file) => {
    if (!groups[file.hash]) groups[file.hash] = [];
    groups[file.hash].push(file);
    return groups;
  }, {} as Record<string, FileItem[]>);

  const deduplicationGroups: DeduplicationGroup[] = Object.entries(fileGroups)
    .filter(([, groupFiles]) => groupFiles.length > 1)
    .map(([hash, groupFiles]) => ({
      hash,
      files: groupFiles,
      totalSize: groupFiles[0].size * groupFiles.length,
      savedSpace: groupFiles[0].size * (groupFiles.length - 1),
    }));

  // 🔹 Handlers
  const handleDeleteFile = async (fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.refCount > 1) {
      setShowConfirmDialog(fileId);
      return;
    }
    try {
      await fetch(`${BASE_URL}/delete?key=${encodeURIComponent(file?.hash ?? "")}`, {
        method: "DELETE",
      });
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  };

  const confirmDelete = () => {
    if (showConfirmDialog) {
      handleDeleteFile(showConfirmDialog);
      setShowConfirmDialog(null);
    }
  };

  const handleDownloadFile = async (fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    try {
      const res = await fetch(`${BASE_URL}/download?key=${encodeURIComponent(file.hash)}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Download failed:", err);
    }
  };

  const totalSavedSpace = deduplicationGroups.reduce((sum, group) => sum + group.savedSpace, 0);
  const totalOriginalSpace = deduplicationGroups.reduce((sum, group) => sum + group.totalSize, 0);
  const efficiencyPercentage =
    totalOriginalSpace > 0 ? (totalSavedSpace / totalOriginalSpace) * 100 : 0;

  if (loading) return <p className="text-gray-400">Loading deduplication data...</p>;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">Duplicate Groups</p>
          <p className="text-2xl font-bold text-white">{deduplicationGroups.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">Space Saved</p>
          <p className="text-2xl font-bold text-green-400">{formatFileSize(totalSavedSpace)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">Efficiency</p>
          <p className="text-2xl font-bold text-blue-400">{efficiencyPercentage.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400">Total Files</p>
          <p className="text-2xl font-bold text-white">{files.length}</p>
        </div>
      </div>

      {/* Deduplication Groups */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Duplicate File Groups</h3>
        </div>
        <div className="p-6">
          {deduplicationGroups.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Perfect Deduplication!</h3>
              <p className="text-gray-400">All your files are unique. No duplicates found.</p>
            </div>
          ) : (
            deduplicationGroups.map(group => (
              <div key={group.hash} className="border border-gray-700 rounded-lg mb-4">
                <div
                  className="p-4 bg-gray-900 cursor-pointer hover:bg-gray-850"
                  onClick={() =>
                    setSelectedGroup(selectedGroup === group.hash ? null : group.hash)
                  }
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-white font-semibold">
                        {group.files.length} identical files
                      </p>
                      <p className="text-sm text-gray-400">
                        Hash: {group.hash} • {formatFileSize(group.files[0].size)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">
                        Saved: {formatFileSize(group.savedSpace)}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedGroup === group.hash && (
                  <div className="p-4 bg-gray-800 space-y-3">
                    {group.files.map(file => (
                      <div key={file.id} className="flex justify-between items-center">
                        <div>
                          <p className="text-white">{file.name}</p>
                          <p className="text-sm text-gray-400">
                            {file.uploader} • {formatDate(file.uploadDate)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDownloadFile(file.id)}
                            className="p-2 text-green-400 hover:text-green-300"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Confirm Deletion</h3>
            <p className="text-gray-300 mb-4">
              This file has multiple references. Deleting will reduce the reference count but won’t free
              up storage until all are deleted. Continue?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Delete Reference
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
