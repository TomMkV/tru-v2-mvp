/**
 * API Client for TRU V2 VLM Inference Service
 * 
 * Type-safe client with proper error handling and progress tracking
 */
import axios, { AxiosError, AxiosProgressEvent } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface VideoProcessingParams {
  fps?: number;
  max_frames?: number;
  min_pixels?: number;
  max_pixels?: number;
  total_pixels?: number;
}

export interface GenerationParams {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

export interface InferenceRequest {
  video_url: string;
  prompt: string;
  video_params?: VideoProcessingParams;
  generation_params?: GenerationParams;
}

export interface InferenceResponse {
  response: string;
  prompt: string;
  video_source: string;
  backend: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface DetailedHealthResponse extends HealthResponse {
  model: {
    loaded: boolean;
    backend: string | null;
    path: string | null;
  };
  gpu: {
    available: boolean;
    count: number;
    devices: Array<{
      id: number;
      name: string;
      memory_allocated_gb: number;
      memory_reserved_gb: number;
    }>;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}

/**
 * API Client singleton
 */
class VLMApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await axios.get<HealthResponse>(`${this.baseURL}/v1/health`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Detailed health check with GPU info
   */
  async detailedHealthCheck(): Promise<DetailedHealthResponse> {
    try {
      const response = await axios.get<DetailedHealthResponse>(`${this.baseURL}/v1/health/detailed`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Inference from URL
   */
  async inferenceFromUrl(request: InferenceRequest): Promise<InferenceResponse> {
    try {
      const response = await axios.post<InferenceResponse>(
        `${this.baseURL}/v1/inference/url`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Inference from uploaded file
   * 
   * @param file Video file to upload
   * @param prompt Text prompt
   * @param videoParams Optional video processing parameters
   * @param generationParams Optional generation parameters
   * @param onUploadProgress Optional callback for upload progress
   */
  async inferenceFromUpload(
    file: File,
    prompt: string,
    videoParams?: VideoProcessingParams,
    generationParams?: GenerationParams,
    onUploadProgress?: (progress: number) => void
  ): Promise<InferenceResponse> {
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('prompt', prompt);

      // Add video params if provided
      if (videoParams) {
        if (videoParams.fps !== undefined) formData.append('fps', videoParams.fps.toString());
        if (videoParams.max_frames !== undefined) formData.append('max_frames', videoParams.max_frames.toString());
        if (videoParams.min_pixels !== undefined) formData.append('min_pixels', videoParams.min_pixels.toString());
        if (videoParams.max_pixels !== undefined) formData.append('max_pixels', videoParams.max_pixels.toString());
        if (videoParams.total_pixels !== undefined) formData.append('total_pixels', videoParams.total_pixels.toString());
      }

      // Add generation params if provided
      if (generationParams) {
        if (generationParams.max_tokens !== undefined) formData.append('max_tokens', generationParams.max_tokens.toString());
        if (generationParams.temperature !== undefined) formData.append('temperature', generationParams.temperature.toString());
        if (generationParams.top_p !== undefined) formData.append('top_p', generationParams.top_p.toString());
        if (generationParams.top_k !== undefined) formData.append('top_k', generationParams.top_k.toString());
      }

      const response = await axios.post<InferenceResponse>(
        `${this.baseURL}/v1/inference/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total && onUploadProgress) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onUploadProgress(percentCompleted);
            }
          },
          // Increase timeout for long-running inference
          timeout: 600000, // 10 minutes
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors with proper typing
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      return {
        message: axiosError.response?.data?.detail || axiosError.message || 'An unknown error occurred',
        status: axiosError.response?.status,
        detail: axiosError.response?.data?.detail,
      };
    }
    
    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    return {
      message: 'An unknown error occurred',
    };
  }
}

// Export singleton instance
export const apiClient = new VLMApiClient();

