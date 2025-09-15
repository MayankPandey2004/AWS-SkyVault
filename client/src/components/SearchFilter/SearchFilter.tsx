import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, FileText, User } from 'lucide-react';

export interface SearchFilters {
  query: string;
  mimeType: string;
  minSize: number;
  maxSize: number;
  startDate: string;
  endDate: string;
  uploader: string;
}

interface SearchFilterProps {
  onFiltersChange: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

const mimeTypeOptions = [
  { value: '', label: 'All file types' },
  { value: 'image/', label: 'Images' },
  { value: 'video/', label: 'Videos' },
  { value: 'audio/', label: 'Audio' },
  { value: 'application/pdf', label: 'PDF documents' },
  { value: 'application/msword', label: 'Word documents' },
  { value: 'application/vnd.ms-excel', label: 'Excel files' },
  { value: 'text/', label: 'Text files' },
];

export const SearchFilter: React.FC<SearchFilterProps> = ({
  onFiltersChange,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    mimeType: '',
    minSize: 0,
    maxSize: 0,
    startDate: '',
    endDate: '',
    uploader: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, onFiltersChange]);

  const updateFilter = (key: keyof SearchFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      mimeType: '',
      minSize: 0,
      maxSize: 0,
      startDate: '',
      endDate: '',
      uploader: '',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      {/* Search Query */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
        <input
          type="text"
          placeholder="Search files by name..."
          value={filters.query}
          onChange={(e) => updateFilter('query', e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Toggle Advanced Filters */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white"
        >
          <Filter className="w-4 h-4" />
          <span>Advanced Filters</span>
        </button>
        
        <button
          onClick={resetFilters}
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          Clear all
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
          {/* File Type */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
              <FileText className="w-4 h-4" />
              <span>File Type</span>
            </label>
            <select
              value={filters.mimeType}
              onChange={(e) => updateFilter('mimeType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              disabled={isLoading}
            >
              {mimeTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* File Size Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              File Size Range
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min (bytes)"
                value={filters.minSize || ''}
                onChange={(e) => updateFilter('minSize', parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                disabled={isLoading}
              />
              <span className="px-2 py-2 text-gray-400">to</span>
              <input
                type="number"
                placeholder="Max (bytes)"
                value={filters.maxSize || ''}
                onChange={(e) => updateFilter('maxSize', parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
            {(filters.minSize > 0 || filters.maxSize > 0) && (
              <p className="text-xs text-gray-400">
                {filters.minSize > 0 && formatFileSize(filters.minSize)}
                {filters.minSize > 0 && filters.maxSize > 0 && ' - '}
                {filters.maxSize > 0 && formatFileSize(filters.maxSize)}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>Date Range</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                disabled={isLoading}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Uploader */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
              <User className="w-4 h-4" />
              <span>Uploader</span>
            </label>
            <input
              type="text"
              placeholder="Filter by uploader email..."
              value={filters.uploader}
              onChange={(e) => updateFilter('uploader', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};