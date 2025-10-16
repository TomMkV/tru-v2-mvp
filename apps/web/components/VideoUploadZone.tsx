'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploadZoneProps {
  onVideoSelect: (file: File) => void;
  selectedVideo: File | null;
  onClear: () => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 1000;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function VideoUploadZone({ onVideoSelect, selectedVideo, onClear, disabled = false }: VideoUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: Array<{ file: File; errors: Array<{ code: string; message: string }> }>) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File too large. Maximum size: ${MAX_SIZE_MB}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload MP4, AVI, MKV, MOV, or WEBM');
      } else {
        setError('Failed to upload file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onVideoSelect(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }, [onVideoSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mkv', '.mov', '.webm'],
    },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled,
  });

  const handleClear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setError(null);
    onClear();
  };

  if (selectedVideo) {
    return (
      <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {preview && (
              <video
                src={preview}
                className="w-32 h-24 object-cover rounded border border-gray-300"
                controls={false}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="font-medium text-gray-900 truncate">{selectedVideo.name}</p>
              </div>
              <p className="text-sm text-gray-500">
                {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedVideo.type}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={handleClear}
              className="ml-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Remove video"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
          isDragActive && 'border-blue-500 bg-blue-50',
          !isDragActive && 'border-gray-300 hover:border-gray-400 bg-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn(
          'w-12 h-12 mx-auto mb-4',
          isDragActive ? 'text-blue-500' : 'text-gray-400'
        )} />
        
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop video here</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag & drop video here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              MP4, AVI, MKV, MOV, WEBM up to {MAX_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

