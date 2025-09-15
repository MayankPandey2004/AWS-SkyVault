import { useState, useCallback } from 'react';
import {
  HardDrive,
  Upload as UploadIcon,
  Search,
  BarChart3,
  Files,
  Users,
  Settings,
  Bell,
  Copy,
  Trash2,
  Download,
  Eye,
  Share2,
  Hash
} from 'lucide-react';
import { FileUpload } from './components/FileUpload/FileUpload';
import { SearchFilter } from './components/SearchFilter/SearchFilter';
import type { SearchFilters } from './components/SearchFilter/SearchFilter';

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

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'browse' | 'deduplication' | 'stats' | 'admin'>('dashboard');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    mimeType: '',
    minSize: 0,
    maxSize: 0,
    startDate: '',
    endDate: '',
    uploader: '',
  });

  const handleFileUpload = useCallback(async (fileList: FileList) => {
  setIsLoading(true);

  try {
    const uploadedFiles: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const formData = new FormData();
      formData.append("file", fileList[i]);

      // Send to Go backend
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();

      // Store backend response as FileItem
      uploadedFiles.push({
        id: Date.now() + i,
        name: data.fileName,
        size: data.size,
        mimeType: data.mimeType,
        uploadDate: new Date().toISOString(),
        uploader: "current-user@example.com",
        downloadCount: 0,
        isPublic: false,
        isDeduplicated: false, // dedup logic can run later
        hash: data.key,        // backend returns S3 object key
        refCount: 1,
        savings: 0,
      });
    }

    setFiles(prev => [...prev, ...uploadedFiles]);
  } catch (error) {
    console.error("Upload failed:", error);
  }

  setIsLoading(false);
}, []);


  // Enhanced file upload with deduplication
  

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700">
        <div className="flex items-center h-16 px-6 border-b border-gray-700">
          <HardDrive className="w-8 h-8 text-blue-400" />
          <h1 className="ml-3 text-xl font-bold">File Vault</h1>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <UploadIcon className="w-5 h-5 mr-3" />
              Upload Files
            </button>

            <button
              onClick={() => setActiveTab('browse')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'browse'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <Search className="w-5 h-5 mr-3" />
              Browse Files
            </button>

            <button
              onClick={() => setActiveTab('deduplication')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'deduplication'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <Copy className="w-5 h-5 mr-3" />
              Deduplication
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Statistics
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Admin Panel
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">U</span>
            </div>
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
                                <button className="text-blue-400 hover:text-blue-300">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-green-400 hover:text-green-300">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button className="text-purple-400 hover:text-purple-300">
                                  <Share2 className="w-4 h-4" />
                                </button>
                                <button className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-4 h-4" />
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
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Storage Statistics</h2>
                <p className="text-gray-400">Detailed analytics of your storage usage and optimization.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">Total Files</dt>
                        <dd className="text-lg font-medium">{deduplicationStats.totalFiles.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">Actual Storage</dt>
                        <dd className="text-lg font-medium">{formatFileSize(deduplicationStats.actualSize)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center">
                        <Copy className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">Duplicates</dt>
                        <dd className="text-lg font-medium">{deduplicationStats.duplicateFiles}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-600 rounded-md flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-400 truncate">Space Saved</dt>
                        <dd className="text-lg font-medium">
                          {formatFileSize(deduplicationStats.savedSpace)}
                          <span className="text-sm text-gray-400 ml-1">
                            ({deduplicationStats.savingsPercentage.toFixed(1)}%)
                          </span>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Usage Chart Placeholder */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-medium mb-4">Storage Efficiency Over Time</h3>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Storage efficiency chart would go here</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Implement with Chart.js or similar charting library
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Panel */}
          {activeTab === 'admin' && (
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
  );
}

export default App;