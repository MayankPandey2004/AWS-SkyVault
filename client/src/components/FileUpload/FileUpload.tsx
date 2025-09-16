import React, { useCallback, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { NotificationList } from '../Notifications/Notification';

interface FileUploadProps {
  onUpload: (files: FileList) => Promise<void>;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  hash?: string;
  isDuplicate?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = "*/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const [notifications, setNotifications] = useState<
    { id: number; message: string; type?: "success" | "error" | "info" }[]
  >([]);
  

  const addNotification = (message: string, type?: "success" | "error" | "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  };

  const validateFiles = (files: FileList): File[] => {
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Size validation
      if (file.size > maxSize) {
        console.error(`File ${file.name} exceeds maximum size`);
        addNotification(`❌ File exceeds maximum size`, "error");
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validFiles = validateFiles(files);

    if (validFiles.length === 0) return;

    // Initialize upload tracking
    const initialUploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(initialUploadFiles);

    try {
      await onUpload(files);

      // Update all files to success
      setUploadFiles(prev =>
        prev.map(uf => ({ ...uf, status: 'success', progress: 100 }))
      );
    } catch (error) {
      // Update all files to error
      setUploadFiles(prev =>
        prev.map(uf => ({
          ...uf,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        }))
      );
    }
  }, [onUpload, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(uf => uf.status !== 'success' && uf.status !== 'error'));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver
            ? 'border-blue-400 bg-gray-800'
            : 'border-gray-600 hover:border-gray-500 bg-gray-800'
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center space-y-4">
          <Upload className="w-12 h-12 text-gray-500" />
          <div>
            <p className="text-lg font-medium text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-400">
              Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadFiles.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">
              Uploading {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Clear completed
            </button>
          </div>

          <div className="space-y-3">
            {uploadFiles.map((uploadFile, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {uploadFile.file.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-gray-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${uploadFile.status === 'success' ? 'bg-green-500' :
                        uploadFile.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>

                  {uploadFile.error && (
                    <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <NotificationList
        notifications={notifications}
        onClose={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />
    </div>
  );
};