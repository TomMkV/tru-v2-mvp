'use client';

import { useEffect, useState } from 'react';
import { Loader2, Upload as UploadIcon, Cpu, Sparkles } from 'lucide-react';

interface ProcessingStateProps {
  stage: 'uploading' | 'processing' | 'done';
  uploadProgress?: number;
}

export function ProcessingState({ stage, uploadProgress = 0 }: ProcessingStateProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (stage === 'uploading' || stage === 'processing') {
      setElapsedSeconds(0);
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="border-2 border-blue-200 rounded-lg p-8 bg-blue-50">
      <div className="flex flex-col items-center text-center">
        {/* Animated icon */}
        <div className="mb-6">
          {stage === 'uploading' && (
            <UploadIcon className="w-12 h-12 text-blue-600 animate-pulse" />
          )}
          {stage === 'processing' && (
            <div className="relative">
              <Cpu className="w-12 h-12 text-blue-600" />
              <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
          {stage === 'done' && (
            <Sparkles className="w-12 h-12 text-green-600" />
          )}
        </div>

        {/* Stage indicator */}
        {stage === 'uploading' && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Uploading Video
            </h3>
            <div className="w-full max-w-md mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </>
        )}

        {stage === 'processing' && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Processing with VLM
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-gray-600">
                Analyzing video frames and generating response...
              </p>
            </div>
          </>
        )}

        {/* Time elapsed */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Time elapsed:</span>
          <span className="font-mono font-semibold text-gray-900">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Helpful note for long processing */}
        {stage === 'processing' && elapsedSeconds > 30 && (
          <p className="mt-4 text-xs text-gray-500 max-w-md">
            VLM processing can take 30s-3min depending on video length. 
            Please don't close this window.
          </p>
        )}
      </div>
    </div>
  );
}

