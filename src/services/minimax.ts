// ============================================================
// MiniMax Relay Platform - MiniMax API Service
// ============================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getConfig } from '../config';
import {
  MiniMaxChatRequest,
  MiniMaxChatResponse,
  MiniMaxImageRequest,
  MiniMaxImageResponse,
  ERROR_CODE_MAP,
  RelayError,
} from '../types';
import {
  transformChatRequest,
  transformChatResponse,
  transformImageRequest,
  transformImageResponse,
} from './transformer';
import {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIImageGenerationRequest,
  OpenAIImageResponse,
} from '../types';

export class MiniMaxService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    const config = getConfig().getMiniMaxConfig();
    this.apiKey = config.api_key;

    this.client = axios.create({
      baseURL: config.base_url,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * Handle chat completion request
   */
  async chatCompletion(
    request: OpenAIChatCompletionRequest
  ): Promise<OpenAIChatCompletionResponse> {
    const minimaxReq = transformChatRequest(request);

    // Determine which MiniMax endpoint to use based on model
    const endpoint = this.getChatEndpoint(request.model);

    try {
      const response = await this.client.post<MiniMaxChatResponse>(
        endpoint,
        minimaxReq
      );

      return transformChatResponse(response.data, request.model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle image generation request
   */
  async imageGeneration(
    request: OpenAIImageGenerationRequest
  ): Promise<OpenAIImageResponse> {
    const minimaxReq = transformImageRequest(request);

    try {
      const response = await this.client.post<MiniMaxImageResponse>(
        '/v1/image_generation',
        minimaxReq
      );

      return transformImageResponse(response.data, request.prompt);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Determine the correct chat endpoint based on model
   * MiniMax has different endpoints for different model types
   */
  private getChatEndpoint(model: string): string {
    // Check for specific model types
    const modelLower = model.toLowerCase();

    if (modelLower.includes('m2.7') || modelLower.includes('m2.5') || modelLower.includes('highspeed')) {
      return '/v1/chat_pro';
    }

    if (modelLower.includes('speech') || modelLower.includes('tts')) {
      return '/v1/t2a_v2';
    }

    if (modelLower.includes('voice') || modelLower.includes('audio')) {
      return '/v1/audio/transcriptions';
    }

    // Default to chat_pro
    return '/v1/chat_pro';
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): RelayError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string; code?: number } }>;
      
      // MiniMax error response format
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        const code = errorData?.error?.code || axiosError.response.status;
        
        const errorInfo = ERROR_CODE_MAP[code] || {
          message: errorData?.error?.message || axiosError.message,
          httpStatus: axiosError.response.status,
        };

        return {
          error: {
            message: errorInfo.message,
            type: this.getErrorType(code),
            code: code,
          },
        };
      }

      // Network or other errors
      return {
        error: {
          message: axiosError.message || 'Network error',
          type: 'api_error',
          code: axiosError.response?.status || 500,
        },
      };
    }

    // Unknown error
    return {
      error: {
        message: 'Unknown error occurred',
        type: 'api_error',
        code: 500,
      },
    };
  }

  /**
   * Get error type based on error code
   */
  private getErrorType(code: number): string {
    switch (code) {
      case 1002:
        return 'rate_limit_error';
      case 1004:
      case 2049:
        return 'authentication_error';
      case 1008:
        return 'payment_required';
      case 1026:
        return 'content_filter';
      case 2013:
        return 'invalid_request_error';
      default:
        return 'api_error';
    }
  }
}

// Singleton instance
let serviceInstance: MiniMaxService | null = null;

export function getMiniMaxService(): MiniMaxService {
  if (!serviceInstance) {
    serviceInstance = new MiniMaxService();
  }
  return serviceInstance;
}
