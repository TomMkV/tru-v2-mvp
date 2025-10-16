'use client';

import { CheckCircle, Copy, Video as VideoIcon } from 'lucide-react';
import { useState } from 'react';

interface ResultDisplayProps {
  response: string;
  prompt: string;
  videoSource: string;
  backend: string;
  videoUrl?: string;
}

export function ResultDisplay({ 
  response, 
  prompt, 
  videoSource, 
  backend,
  videoUrl 
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">Analysis Complete</h2>
      </div>

      {/* Video preview (if available) */}
      {videoUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <VideoIcon className="w-4 h-4" />
            Original Video
          </div>
          <video
            src={videoUrl}
            controls
            className="w-full max-h-96 rounded-lg border border-gray-300 bg-black"
          />
        </div>
      )}

      {/* Prompt used */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Prompt</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700 italic">&ldquo;{prompt}&rdquo;</p>
        </div>
      </div>

      {/* Generated response */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Generated Response</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="p-6 bg-white rounded-lg border-2 border-blue-200">
          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
            {response}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Video Source</p>
          <p className="text-sm font-medium text-gray-700 truncate">{videoSource}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Model Backend</p>
          <p className="text-sm font-medium text-gray-700">
            {backend === 'vllm' ? 'vLLM (Optimized)' : 'HuggingFace Transformers'}
          </p>
        </div>
      </div>
    </div>
  );
}

