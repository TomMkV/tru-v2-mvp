'use client';

import { useState } from 'react';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { PromptInput } from '@/components/PromptInput';
import { ProcessingState } from '@/components/ProcessingState';
import { ResultDisplay } from '@/components/ResultDisplay';
import { apiClient, InferenceResponse, ApiError } from '@/lib/api';
import { AlertCircle, PlayCircle, RotateCcw } from 'lucide-react';

type AppState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [result, setResult] = useState<InferenceResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const handleVideoSelect = (file: File) => {
    setSelectedVideo(file);
    // Create preview URL for result display
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setError(null);
  };

  const handleClearVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedVideo || !prompt.trim()) {
      setError({
        message: 'Please select a video and enter a prompt',
      });
      return;
    }

    try {
      setState('uploading');
      setError(null);
      setResult(null);

      const response = await apiClient.inferenceFromUpload(
        selectedVideo,
        prompt,
        undefined, // Use default video params
        undefined, // Use default generation params
        (progress) => {
          setUploadProgress(progress);
          // Transition to processing once upload is complete
          if (progress === 100) {
            setState('processing');
          }
        }
      );

      setState('success');
      setResult(response);
    } catch (err) {
      setState('error');
      setError(err as ApiError);
    }
  };

  const handleReset = () => {
    setState('idle');
    handleClearVideo();
    setPrompt('');
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const canSubmit = selectedVideo && prompt.trim().length > 0 && state === 'idle';
  const isProcessing = state === 'uploading' || state === 'processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <PlayCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TRU Platform v2</h1>
              <p className="text-sm text-gray-600">Vision Language Model Analysis</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Input Section */}
          {(state === 'idle' || state === 'uploading' || state === 'processing') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Video
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select a video file to analyze with the vision language model
                </p>
                <VideoUploadZone
                  onVideoSelect={handleVideoSelect}
                  selectedVideo={selectedVideo}
                  onClear={handleClearVideo}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Enter Prompt
                </h2>
                <PromptInput
                  value={prompt}
                  onChange={setPrompt}
                  disabled={isProcessing}
                  placeholder="What is happening in this video? Describe the scene, actions, and any notable details..."
                />
              </div>

              {!isProcessing && (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
                >
                  <PlayCircle className="w-5 h-5" />
                  Process Video
                </button>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <ProcessingState
              stage={state === 'uploading' ? 'uploading' : 'processing'}
              uploadProgress={uploadProgress}
            />
          )}

          {/* Error Display */}
          {state === 'error' && error && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Processing Failed
                  </h3>
                  <p className="text-gray-700 mb-4">{error.message}</p>
                  {error.detail && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                      {error.detail}
                    </p>
                  )}
                  <button
                    onClick={handleReset}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Result */}
          {state === 'success' && result && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <ResultDisplay
                response={result.response}
                prompt={result.prompt}
                videoSource={result.video_source}
                backend={result.backend}
                videoUrl={videoPreviewUrl || undefined}
              />
              
              <button
                onClick={handleReset}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Analyze Another Video
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 mt-12 text-center text-sm text-gray-500">
        <p>
          Powered by Qwen3-VL • FastAPI • NextJS
        </p>
      </footer>
    </div>
  );
}
