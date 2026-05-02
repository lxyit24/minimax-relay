// ============================================================
// MiniMax Relay Platform - Image Generation Route
// ============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMiniMaxService } from '../services/minimax';
import { getConfig } from '../config';
import { OpenAIImageGenerationRequest } from '../types';
import { createImageRateLimiter } from '../middleware/ratelimit';
import { extractApiKey } from '../utils/apiKey';

const router = Router();

// Apply image-specific rate limiting
router.use(createImageRateLimiter());

// Validation schema for image generation request
const imageGenerationSchema = z.object({
	model: z.string().optional(),
	prompt: z.string().min(1).max(1500),
	n: z.number().int().min(1).max(9).optional(),
	size: z.enum([
		'256x256',
		'512x512',
		'1024x1024',
		'1792x1024',
		'1024x1792'
	]).optional(),
	response_format: z.enum(['url', 'b64_json']).optional(),
	style: z.enum(['vivid', 'natural']).optional(),
	user: z.string().optional(),
});

/**
 * POST /v1/images/generations
 * OpenAI-compatible image generation endpoint
 *
 * MiniMax-specific: uses /v1/image_generation
 */
router.post('/images/generations', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		// Validate request body
		const validationResult = imageGenerationSchema.safeParse(req.body);

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

		const request = validationResult.data as OpenAIImageGenerationRequest;

		// Check if image model is enabled (skipped if bypass_model_check is true)
		const config = getConfig();
		const modelToUse = request.model || 'image-01';

		if (!config.isModelEnabled(modelToUse) && !config.isModelEnabled('image-01')) {
			res.status(400).json({
				error: {
					message: `Image model is not enabled`,
					type: 'invalid_request_error',
					code: 400,
				},
			});
			return;
		}

		// Call MiniMax service with optional API key override
		const service = getMiniMaxService();
		const response = await service.imageGeneration(request, apiKey);

		res.json(response);
	} catch (error: any) {
		console.error('Image generation error:', error);

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
 * POST /v1/image_generation
 * MiniMax native image generation endpoint
 */
router.post('/image_generation', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		// This is the MiniMax native format
		const request: OpenAIImageGenerationRequest = {
			model: req.body.model || 'image-01',
			prompt: req.body.prompt,
			n: req.body.n,
			size: req.body.size || '1024x1024',
			response_format: req.body.response_format === 'url' ? 'url' : 'b64_json',
		};

		const service = getMiniMaxService();
		const response = await service.imageGeneration(request, apiKey);

		res.json(response);
	} catch (error: any) {
		console.error('Image generation error:', error);

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
