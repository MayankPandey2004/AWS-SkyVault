import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import {
  HardDrive,
  Upload as UploadIcon,
  Search,
  BarChart3,
  Files,
  Users,
  Bell,
  Copy,
  Trash2,
  Download,
  Share2,
  Hash
} from 'lucide-react';
import { AuthGuard } from './components/Auth/AuthGuard';
import { FileUpload } from './components/FileUpload/FileUpload';
import { SearchFilter, type SearchFilters } from './components/SearchFilter/SearchFilter';
import { AdminAnalytics } from './components/Analytics/AdminAnalytics';
import { UserAnalytics } from './components/Analytics/UserAnalytics';
import { useUserRole } from './hooks/useUserRole';
import { NotificationList } from './components/Notifications/Notification';

// Enhanced types for deduplication
interface FileItem {
  id: number;
  name: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  uploader: string;
  downloadCount: number;
  isPublic: boolean;
  isDeduplicated: boolean;
  hash: string;
  refCount: number;
  originalUploader?: string;
  duplicateOf?: number;
  savings: number;
  s3Key: string;
}


interface DeduplicationStats {
  totalFiles: number;
  uniqueFiles: number;
  duplicateFiles: number;
  totalSize: number;
  actualSize: number;
  savedSpace: number;
  savingsPercentage: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function App() {
  const { user } = useUser();
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'browse' | 'deduplication' | 'stats' | 'admin'>('dashboard');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    mimeType: '',
    minSize: 0,
    maxSize: 0,
    startDate: '',
    endDate: '',
    uploader: ''
  });

  const [notifications, setNotifications] = useState<
    { id: number; message: string; type?: "success" | "error" | "info" }[]
  >([]);

  const addNotification = (message: string, type?: "success" | "error" | "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);


  // Fetch existing files for user when component mounts
  useEffect(() => {
    const fetchUserFiles = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const username = user.primaryEmailAddress?.emailAddress || user.id;

        const res = await fetch(
          `${BASE_URL}/files?username=${encodeURIComponent(username)}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch files");
        }

        const data = await res.json();

        // Map backend data to FileItem[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loadedFiles: FileItem[] = data.map((f: any, idx: number) => ({
          id: f.id || idx,
          name: f.fileName,
          size: f.size,
          mimeType: f.mimeType || "application/octet-stream",
          uploadDate: f.uploadDate,
          uploader: username,
          downloadCount: f.downloadCount || 0,
          isPublic: false,
          isDeduplicated: f.refCount > 1,  // ✅ backend refCount decides
          hash: f.hash,
          refCount: f.refCount || 1,
          savings: f.refCount > 1 ? f.size : 0,
          s3Key: f.s3Key,
        }));



        setFiles(loadedFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
      setIsLoading(false);
    };

    fetchUserFiles();
  }, [user]);


  // Enhanced file upload with deduplication
  // inside App.tsx
  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (!user) return;
      setIsLoading(true);

      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];

          const formData = new FormData();
          formData.append("file", file);
          formData.append("username", user.primaryEmailAddress?.emailAddress || user.id);

          const res = await fetch(`${BASE_URL}/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            addNotification(`❌ Failed to upload ${file.name}`, "error");
            continue;
          }

          const data = await res.json();

          const uploadedFile: FileItem = {
            id: Date.now() + i,
            name: data.fileName,
            size: data.size,
            mimeType: data.mimeType,
            uploadDate: new Date().toISOString(),
            uploader: user.primaryEmailAddress?.emailAddress || "unknown",
            downloadCount: 0,
            isPublic: false,
            isDeduplicated: data.duplicate || false, // ✅ from backend
            hash: data.hash,
            refCount: data.refCount || 1,
            savings: data.duplicate ? data.size : 0,
            s3Key: data.s3Key || data.key,
          };

          setFiles((prev) => [...prev, uploadedFile]);

          addNotification(
            uploadedFile.isDeduplicated
              ? `⚠️ Duplicate skipped: ${file.name}`
              : `✅ Uploaded: ${file.name}`,
            uploadedFile.isDeduplicated ? "info" : "success"
          );
        }
      } catch (error) {
        console.error("Upload failed:", error);
        addNotification("❌ An unexpected error occurred while uploading", "error");
      }

      setIsLoading(false);
    },
    [user]
  );

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

  // Filter files based on search criteria
  const filteredFiles = files.filter(file => {
    if (searchFilters.query && !file.name.toLowerCase().includes(searchFilters.query.toLowerCase())) {
      return false;
    }
    if (searchFilters.mimeType && !file.mimeType.startsWith(searchFilters.mimeType)) {
      return false;
    }
    if (searchFilters.minSize && file.size < searchFilters.minSize) {
      return false;
    }
    if (searchFilters.maxSize && file.size > searchFilters.maxSize) {
      return false;
    }
    if (searchFilters.uploader && !file.uploader.toLowerCase().includes(searchFilters.uploader.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate deduplication statistics
  const deduplicationStats: DeduplicationStats = {
    totalFiles: files.length,
    uniqueFiles: files.filter(f => !f.isDeduplicated).length,
    duplicateFiles: files.filter(f => f.isDeduplicated).length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    actualSize: files.filter(f => !f.isDeduplicated).reduce((sum, file) => sum + file.size, 0),
    savedSpace: files.filter(f => f.isDeduplicated).reduce((sum, file) => sum + file.savings, 0),
    savingsPercentage: 0
  };

  deduplicationStats.savingsPercentage = deduplicationStats.totalSize > 0
    ? (deduplicationStats.savedSpace / deduplicationStats.totalSize) * 100
    : 0;

  // Group files by hash for deduplication view
  const fileGroups = files.reduce((groups, file) => {
    if (!groups[file.hash]) {
      groups[file.hash] = [];
    }
    groups[file.hash].push(file);
    return groups;
  }, {} as Record<string, FileItem[]>);

  const duplicateGroups = Object.values(fileGroups).filter(group => group.length > 1);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700">
          <div className="flex items-center h-16 px-6 border-b border-gray-700">
            <HardDrive className="w-8 h-8 text-blue-400" />
            <h1 className="ml-3 text-xl font-bold">AWS SkyVault</h1>
          </div>

          <nav className="mt-6 px-3">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'dashboard'
                  ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                  }`}
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'upload'
                  ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                  }`}
              >
                <UploadIcon className="w-5 h-5 mr-3" />
                Upload Files
              </button>

              <button
                onClick={() => setActiveTab('browse')}
                className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'browse'
                  ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                  }`}
              >
                <Search className="w-5 h-5 mr-3" />
                Browse Files
              </button>

              <button
                onClick={() => setActiveTab('deduplication')}
                className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'deduplication'
                  ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                  }`}
              >
                <Copy className="w-5 h-5 mr-3" />
                Deduplication
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'stats'
                  ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                  }`}
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                {isAdmin ? 'Analytics' : 'My Stats'}
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'admin'
                    ? 'bg-blue-500/20 backdrop-blur-md text-white text-lg font-semibold border border-blue-400/30 shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white text-base font-medium'
                    }`}
                >
                  <Users className="w-5 h-5 mr-3" />
                  Admin Panel
                </button>
              )}
            </div>
          </nav>

          {/* User Profile Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
            <div className="flex items-center space-x-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-gray-800 border-gray-700",
                    userButtonPopoverActionButton: "text-gray-300 hover:text-white hover:bg-gray-700"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
                {isAdmin && (
                  <p className="text-xs text-blue-400">Administrator</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-64">
          {/* Top Header */}
          <header className="bg-gray-800 border-b border-gray-700 h-16 flex flex-row-reverse items-center justify-between px-6">
            <div className="relative">
              <button
                className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700 relative"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Dropdown preview */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-700 font-semibold text-white">
                    Notifications
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-700">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-gray-400 text-sm text-center">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 text-sm text-gray-300 flex items-center justify-between hover:bg-gray-700"
                        >
                          <span>{n.message}</span>
                          <button
                            onClick={() =>
                              setNotifications((prev) =>
                                prev.filter((notif) => notif.id !== n.id)
                              )
                            }
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-700 text-center text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                    View all
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Content Area */}
          <main className="p-6">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Files className="w-6 h-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-400">Total Files</p>
                        <p className="text-2xl font-bold">{deduplicationStats.totalFiles}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-400">Storage Used</p>
                        <p className="text-2xl font-bold">{formatFileSize(deduplicationStats.actualSize)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <Copy className="w-6 h-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-400">Duplicates</p>
                        <p className="text-2xl font-bold">{deduplicationStats.duplicateFiles}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-600 rounded-lg">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-gray-400">Space Saved</p>
                        <p className="text-2xl font-bold">{formatFileSize(deduplicationStats.savedSpace)}</p>
                        <p className="text-xs text-gray-500">({deduplicationStats.savingsPercentage.toFixed(1)}%)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                  </div>
                  <div className="p-6">
                    {files.slice(0, 5).map((file) => (
                      <div key={file.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${file.isDeduplicated ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                            {file.isDeduplicated ? <Copy className="w-4 h-4" /> : <Files className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-400">
                              {file.isDeduplicated ? 'Deduplicated' : 'New file'} • {formatDate(file.uploadDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatFileSize(file.size)}</p>
                          {file.isDeduplicated && (
                            <p className="text-sm text-green-400">Saved {formatFileSize(file.savings)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Upload Files</h2>
                  <p className="text-gray-400">Upload your files securely with automatic deduplication.</p>
                </div>

                <FileUpload
                  onUpload={handleFileUpload}
                  maxSize={10 * 1024 * 1024} // 10MB
                  multiple={true}
                />
              </div>
            )}

            {/* Browse Tab */}
            {activeTab === 'browse' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Browse Files</h2>
                  <p className="text-gray-400">Search and filter your uploaded files.</p>
                </div>

                <SearchFilter
                  onFiltersChange={setSearchFilters}
                  isLoading={isLoading}
                />

                {/* File List */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-medium">
                      {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
                      {filteredFiles.length !== files.length && ` (filtered from ${files.length} total)`}
                    </h3>
                  </div>

                  {filteredFiles.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No files found</h3>
                      <p className="text-gray-400">
                        {files.length === 0
                          ? "Upload some files to get started."
                          : "Try adjusting your search filters."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uploaded</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredFiles.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`p-2 rounded-lg mr-3 ${file.isDeduplicated ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                                    {file.isDeduplicated ? <Copy className="w-4 h-4" /> : <Files className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{file.name}</div>
                                    {file.isDeduplicated && (
                                      <div className="text-xs text-gray-400">
                                        <Hash className="w-3 h-3 inline mr-1" />
                                        {file.hash}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {formatFileSize(file.size)}
                                {file.isDeduplicated && (
                                  <div className="text-xs text-green-400">
                                    Saved {formatFileSize(file.savings)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                {file.mimeType || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                {formatDate(file.uploadDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  {file.isPublic ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                      Public
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                      Private
                                    </span>
                                  )}
                                  {file.isDeduplicated && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                                      Deduplicated
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-green-400 hover:text-green-300"
                                    onClick={() => {
                                      const url = `${BASE_URL}/download?key=${encodeURIComponent(file.s3Key)}`;
                                      window.open(url, "_blank");
                                      addNotification("✅ Started Download...", "success");
                                    }}
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>

                                  <button
                                    className="text-red-400 hover:text-red-300"
                                    onClick={async () => {
                                      const confirmed = window.confirm(`Delete ${file.name}?`);
                                      if (!confirmed) return;

                                      const res = await fetch(
                                        `${BASE_URL}/delete?key=${encodeURIComponent(file.s3Key)}`,
                                        { method: "DELETE" }
                                      );

                                      if (res.ok) {
                                        setFiles((prev) => prev.filter((f) => f.id !== file.id));
                                        addNotification(`🗑️ Deleted: ${file.name}`, "success");
                                      } else {
                                        addNotification(`❌ Failed to delete ${file.name}`, "error");
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    className="text-purple-400 hover:text-purple-300"
                                    onClick={() => {
                                      const shareLink = `${BASE_URL}/download?key=${encodeURIComponent(file.s3Key)}`;
                                      navigator.clipboard.writeText(shareLink);
                                      addNotification("🔗 Link copied to clipboard!", "info");
                                    }}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Deduplication Tab */}
            {activeTab === 'deduplication' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">File Deduplication</h2>
                  <p className="text-gray-400">Manage duplicate files and optimize storage usage.</p>
                </div>

                {/* Deduplication Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Duplicate Groups</p>
                        <p className="text-2xl font-bold">{duplicateGroups.length}</p>
                      </div>
                      <Copy className="w-8 h-8 text-yellow-500" />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Space Saved</p>
                        <p className="text-2xl font-bold">{formatFileSize(deduplicationStats.savedSpace)}</p>
                      </div>
                      <HardDrive className="w-8 h-8 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Efficiency</p>
                        <p className="text-2xl font-bold">{deduplicationStats.savingsPercentage.toFixed(1)}%</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Duplicate Groups */}
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-6 border-b border-gray-700">
                    <h3 className="text-lg font-semibold">Duplicate File Groups</h3>
                  </div>
                  <div className="p-6">
                    {duplicateGroups.length === 0 ? (
                      <div className="text-center py-8">
                        <Copy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
                        <p className="text-gray-400">All your files are unique!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {duplicateGroups.map((group, index) => (
                          <div key={index} className="border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-yellow-600 rounded-lg">
                                  <Hash className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-medium">Hash: {group[0].hash}</h4>
                                  <p className="text-sm text-gray-400">
                                    {group.length} copies • {formatFileSize(group[0].size)} each
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-400">
                                  Saved: {formatFileSize(group[0].size * (group.length - 1))}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {group.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-2 h-2 rounded-full ${file.isDeduplicated ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                                    <div>
                                      <p className="font-medium">{file.name}</p>
                                      <p className="text-sm text-gray-400">
                                        {file.uploader} • {formatDate(file.uploadDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {!file.isDeduplicated && (
                                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                                        Original
                                      </span>
                                    )}
                                    <button className="text-red-400 hover:text-red-300">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <>
                {isAdmin ? (
                  <AdminAnalytics />
                ) : (
                  <UserAnalytics userEmail={user?.primaryEmailAddress?.emailAddress || ""} />
                )}
              </>
            )}


            {/* Admin Panel */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
                  <p className="text-gray-400">System administration and user management.</p>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-medium mb-4">System Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{files.length}</div>
                      <div className="text-sm text-gray-400">Total Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">1</div>
                      <div className="text-sm text-gray-400">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatFileSize(deduplicationStats.actualSize)}</div>
                      <div className="text-sm text-gray-400">Storage Used</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <NotificationList
        notifications={notifications}
        onClose={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

    </AuthGuard>
  );
}

export default App;