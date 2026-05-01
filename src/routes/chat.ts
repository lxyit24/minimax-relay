// ============================================================
// MiniMax Relay Platform - Chat Completions Route
// ============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMiniMaxService } from '../services/minimax';
import { getConfig } from '../config';
import { OpenAIChatCompletionRequest } from '../types';

const router = Router();

// Validation schema for chat completion request
const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant', 'function']),
      content: z.string(),
      name: z.string().optional(),
    })
  ).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  max_tokens: z.number().int().min(1).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
});

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completion endpoint
 */
router.post('/chat/completions', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = chatCompletionSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          message: validationResult.error.errors[0].message,
          type: 'invalid_request_error',
          code: 400,
        },
      });
      return;
    }

    const request = validationResult.data as OpenAIChatCompletionRequest;

    // Check if model is enabled
    const config = getConfig();
    if (!config.isModelEnabled(request.model)) {
      res.status(400).json({
        error: {
          message: `Model '${request.model}' is not enabled`,
          type: 'invalid_request_error',
          code: 400,
        },
      });
      return;
    }

    // Call MiniMax service
    const service = getMiniMaxService();
    const response = await service.chatCompletion(request);

    res.json(response);
  } catch (error: any) {
    console.error('Chat completion error:', error);

    if (error.error) {
      res.status(error.error.code || 500).json(error);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'api_error',
          code: 500,
        },
      });
    }
  }
});

/**
 * POST /v1/completions
 * Legacy completion endpoint (converted to chat)
 */
router.post('/completions', async (req: Request, res: Response) => {
  try {
    // Convert legacy completion format to chat format
    const legacyRequest = req.body;
    
    const chatRequest: OpenAIChatCompletionRequest = {
      model: legacyRequest.model || getConfig().getDefaultModel(),
      messages: [
        { role: 'user', content: legacyRequest.prompt || '' }
      ],
      temperature: legacyRequest.temperature,
      max_tokens: legacyRequest.max_tokens,
    };

    const service = getMiniMaxService();
    const response = await service.chatCompletion(chatRequest);

    // Convert response back to legacy format
    res.json({
      id: response.id,
      object: 'text_completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice) => ({
        text: choice.message.content,
        index: choice.index,
        finish_reason: choice.finish_reason,
      })),
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('Completion error:', error);

    if (error.error) {
      res.status(error.error.code || 500).json(error);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'api_error',
          code: 500,
        },
      });
    }
  }
});

export default router;
