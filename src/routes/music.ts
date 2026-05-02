// ============================================================
// MiniMax Relay Platform - Music Generation Route
// ============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMiniMaxService } from '../services/minimax';
import { getConfig } from '../config';
import { OpenAIMusicRequest } from '../types';
import { extractApiKey } from '../utils/apiKey';

const router = Router();

// Validation schema for music generation request
const musicGenerationSchema = z.object({
	model: z.string().optional(),
	prompt: z.string().min(1).max(8000),
	lyrics: z.string().optional(),
	lang: z.string().optional(),
	title: z.string().optional(),
	style: z.string().optional(),
	tags: z.string().optional(),
});

/**
 * POST /v1/music_generation
 * Music generation endpoint
 */
router.post('/music_generation', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const validationResult = musicGenerationSchema.safeParse(req.body);

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

		const request = validationResult.data as OpenAIMusicRequest;
		const model = request.model || 'music-2.6';

		// Check if model is enabled (skipped if bypass_model_check is true)
		const config = getConfig();
		if (!config.isModelEnabled(model)) {
			res.status(400).json({
				error: {
					message: `Model '${model}' is not enabled`,
					type: 'invalid_request_error',
					code: 400,
				},
			});
			return;
		}

		// Call MiniMax service with optional API key override
		const service = getMiniMaxService();
		const response = await service.musicGeneration({ ...request, model }, apiKey);

		res.json(response);
	} catch (error: any) {
		console.error('Music generation error:', error);

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
