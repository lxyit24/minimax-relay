// ============================================================
// MiniMax Relay Platform - Speech Synthesis Route
// ============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getMiniMaxService } from '../services/minimax';
import { getConfig } from '../config';
import { OpenAISpeechRequest } from '../types';
import { extractApiKey } from '../utils/apiKey';

const router = Router();

// Validation schema for speech synthesis request
const speechSchema = z.object({
	model: z.string().optional(),
	input: z.string().min(1),
	voice: z.string().optional(),
	speed: z.number().min(0.5).max(2).optional(),
	response_format: z.enum(['mp3', 'wav', 'opus', 'aac']).optional(),
});

/**
 * POST /v1/audio/speech
 * OpenAI-compatible speech synthesis endpoint
 */
router.post('/audio/speech', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		// Validate request body
		const validationResult = speechSchema.safeParse(req.body);

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

		const request = validationResult.data as OpenAISpeechRequest;

		// Check if speech model is enabled (skipped if bypass_model_check is true)
		const config = getConfig();
		const modelToUse = request.model || 'speech-02-turbo';

		if (!config.isModelEnabled(modelToUse) && !config.isModelEnabled('speech-02-turbo')) {
			res.status(400).json({
				error: {
					message: `Speech model '${modelToUse}' is not enabled`,
					type: 'invalid_request_error',
					code: 400,
				},
			});
			return;
		}

		// Call MiniMax service with optional API key override
		const service = getMiniMaxService();
		const response = await service.speechGeneration(request, apiKey);

		// Return the audio data directly
		// response.data should be base64 encoded audio
		const format = request.response_format || 'mp3';
		res.setHeader('Content-Type', `audio/${format === 'mp3' ? 'mpeg' : format}`);
		res.setHeader('Content-Disposition', `inline; filename="speech.${format}"`);
		res.send(Buffer.from(response.data, 'base64'));
	} catch (error: any) {
		console.error('Speech synthesis error:', error);

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
 * POST /v1/speech/generations
 * MiniMax speech generation endpoint (text-to-speech)
 */
router.post('/speech/generations', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const request: OpenAISpeechRequest = {
			model: req.body.model || 'speech-02-turbo',
			input: req.body.text || req.body.input,
			voice: req.body.voice,
			speed: req.body.speed,
			response_format: req.body.response_format,
		};

		const service = getMiniMaxService();
		const response = await service.speechGeneration(request, apiKey);

		// Return as base64 audio
		res.json({
			object: 'audio.speech',
			model: request.model,
			data: Buffer.from(response.data, 'base64').toString('base64'),
			format: request.response_format || 'mp3',
		});
	} catch (error: any) {
		console.error('Speech generation error:', error);

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
 * POST /v1/t2a_v2
 * MiniMax native text-to-audio endpoint
 */
router.post('/t2a_v2', async (req: Request, res: Response) => {
	try {
		// Extract API key from header if present
		const apiKey = extractApiKey(req);

		const request: OpenAISpeechRequest = {
			model: req.body.model || 'speech-02-turbo',
			input: req.body.text || req.body.input,
			voice: req.body.voice,
			speed: req.body.speed,
			response_format: req.body.response_format,
		};

		const service = getMiniMaxService();
		const response = await service.speechGeneration(request, apiKey);

		const format = request.response_format || 'mp3';
		res.setHeader('Content-Type', `audio/${format === 'mp3' ? 'mpeg' : format}`);
		res.send(Buffer.from(response.data, 'base64'));
	} catch (error: any) {
		console.error('T2A error:', error);

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
