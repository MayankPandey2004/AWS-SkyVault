import React, { useState } from 'react';
import { Hash, Copy, Trash2, Eye, Download, AlertTriangle, CheckCircle } from 'lucide-react';

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

interface DeduplicationManagerProps {
  files: FileItem[];
  onDeleteFile: (fileId: number) => void;
  onViewFile: (fileId: number) => void;
  onDownloadFile: (fileId: number) => void;
}

export const DeduplicationManager: React.FC<DeduplicationManagerProps> = ({
  files,
  onDeleteFile,
  onViewFile,
  onDownloadFile
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);

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

  // Group files by hash
  const fileGroups = files.reduce((groups, file) => {
    if (!groups[file.hash]) {
      groups[file.hash] = [];
    }
    groups[file.hash].push(file);
    return groups;
  }, {} as Record<string, FileItem[]>);

  // Create deduplication groups (only groups with multiple files)
  const deduplicationGroups: DeduplicationGroup[] = Object.entries(fileGroups)
    .filter(([, groupFiles]) => groupFiles.length > 1)
    .map(([hash, groupFiles]) => ({
      hash,
      files: groupFiles,
      totalSize: groupFiles[0].size * groupFiles.length,
      savedSpace: groupFiles[0].size * (groupFiles.length - 1)
    }));

  const handleDeleteFile = (fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.refCount > 1) {
      setShowConfirmDialog(fileId);
    } else {
      onDeleteFile(fileId);
    }
  };

  const confirmDelete = () => {
    if (showConfirmDialog) {
      onDeleteFile(showConfirmDialog);
      setShowConfirmDialog(null);
    }
  };

  const totalSavedSpace = deduplicationGroups.reduce((sum, group) => sum + group.savedSpace, 0);
  const totalOriginalSpace = deduplicationGroups.reduce((sum, group) => sum + group.totalSize, 0);
  const efficiencyPercentage = totalOriginalSpace > 0 ? (totalSavedSpace / totalOriginalSpace) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Duplicate Groups</p>
              <p className="text-2xl font-bold text-white">{deduplicationGroups.length}</p>
            </div>
            <Copy className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Space Saved</p>
              <p className="text-2xl font-bold text-green-400">{formatFileSize(totalSavedSpace)}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Efficiency</p>
              <p className="text-2xl font-bold text-blue-400">{efficiencyPercentage.toFixed(1)}%</p>
            </div>
            <Hash className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Files</p>
              <p className="text-2xl font-bold text-white">{files.length}</p>
            </div>
            <Eye className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Deduplication Groups */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Duplicate File Groups</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage files with identical content to optimize storage
          </p>
        </div>
        
        <div className="p-6">
          {deduplicationGroups.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Perfect Deduplication!</h3>
              <p className="text-gray-400">
                All your files are unique. No duplicates found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deduplicationGroups.map((group) => (
                <div key={group.hash} className="border border-gray-700 rounded-lg overflow-hidden">
                  <div 
                    className="p-4 bg-gray-900 cursor-pointer hover:bg-gray-850 transition-colors"
                    onClick={() => setSelectedGroup(selectedGroup === group.hash ? null : group.hash)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-yellow-600 rounded-lg">
                          <Hash className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">
                            {group.files.length} identical files
                          </h4>
                          <p className="text-sm text-gray-400">
                            Hash: {group.hash} • {formatFileSize(group.files[0].size)} each
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">
                          Saved: {formatFileSize(group.savedSpace)}
                        </p>
                        <p className="text-sm text-gray-400">
                          {((group.savedSpace / group.totalSize) * 100).toFixed(1)}% efficiency
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedGroup === group.hash && (
                    <div className="border-t border-gray-700">
                      <div className="p-4 space-y-3">
                        {group.files.map((file, index) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-blue-500' : 'bg-yellow-500'
                              }`} />
                              <div>
                                <p className="font-medium text-white">{file.name}</p>
                                <p className="text-sm text-gray-400">
                                  {file.uploader} • {formatDate(file.uploadDate)}
                                  {index === 0 && (
                                    <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                                      Original
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onViewFile(file.id)}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                                title="View file"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDownloadFile(file.id)}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Delete file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              This file has multiple references. Deleting it will reduce the reference count but won't 
              free up storage space until all references are removed. Are you sure you want to continue?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Delete Reference
              </button>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
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