// ============================================================
// MiniMax Relay Platform - Video Generation Route
// ============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMiniMaxService } from '../services/minimax';
import { getConfig } from '../config';
import { OpenAIVideoRequest } from '../types';
import { extractApiKey } from '../utils/apiKey';

const router = Router();

// Validation schema for video generation request
const videoGenerationSchema = z.object({
	model: z.string().optional(),
	prompt: z.string().optional(),
	input_files: z.array(z.string()).optional(),
	first_frame_image: z.string().optional(),
	last_frame_image: z.string().optional(),
	subject_reference: z.array(z.string()).optional(),
	duration: z.number().min(1).max(10).optional(),
	resolution: z.enum(['720p', '1080p']).optional(),
	subject_position: z.array(z.number()).optional(),
});

/**
 * POST /v1/video_generation
 * MiniMax video generation endpoint (text-to-video)
 */
router.post('/video_generation', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const validationResult = videoGenerationSchema.safeParse(req.body);

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

		const request = validationResult.data as OpenAIVideoRequest;
		const model = request.model || 'MiniMax-Hailuo-02';

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
		const response = await service.videoGeneration({ ...request, model }, apiKey);

		res.json(response);
	} catch (error: any) {
		console.error('Video generation error:', error);

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
 * POST /v1/video_generation/t2v
 * Text-to-video endpoint
 */
router.post('/video_generation/t2v', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const model = req.body.model || 'MiniMax-Hailuo-02';
		const request: OpenAIVideoRequest = {
			model,
			prompt: req.body.prompt,
			duration: req.body.duration || 5,
			resolution: req.body.resolution || '1080p',
		};

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

		const service = getMiniMaxService();
		const response = await service.videoGeneration(request, apiKey);
		res.json(response);
	} catch (error: any) {
		console.error('T2V error:', error);

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
 * POST /v1/video_generation/i2v
 * Image-to-video endpoint
 */
router.post('/video_generation/i2v', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const model = req.body.model || 'MiniMax-Hailuo-02';
		const request: OpenAIVideoRequest = {
			model,
			prompt: req.body.prompt,
			input_files: req.body.input_files || [req.body.first_frame_image],
			first_frame_image: req.body.first_frame_image,
			last_frame_image: req.body.last_frame_image,
			duration: req.body.duration || 5,
			resolution: req.body.resolution || '1080p',
		};

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

		const service = getMiniMaxService();
		const response = await service.videoGeneration(request, apiKey);
		res.json(response);
	} catch (error: any) {
		console.error('I2V error:', error);

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
