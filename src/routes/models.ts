// ============================================================
// MiniMax Relay Platform - Models Route
// ============================================================

import { Router, Request, Response } from 'express';
import { getConfig } from '../config';
import { ModelInfo, ModelType } from '../types';

const router = Router();

/**
 * Get model type based on model ID
 */
function getModelType(modelId: string): ModelType {
  const lower = modelId.toLowerCase();

  if (lower.includes('image')) return 'image';
  if (lower.includes('speech') || lower.includes('t2a')) return 'speech';
  if (lower.includes('hailuo') || lower.includes('video')) return 'video';
  if (lower.includes('music')) return 'music';

  return 'chat';
}

/**
 * GET /v1/models
 * Returns list of available models
 */
router.get('/models', (_req: Request, res: Response) => {
  const config = getConfig();
  const enabledModels = config.getModelsConfig().enabled;

  const models: ModelInfo[] = enabledModels.map((modelId) => ({
    id: modelId,
    object: 'model',
    owned_by: 'minimax',
    type: getModelType(modelId),
  }));

  res.json({
    object: 'list',
    data: models,
  });
});

/**
 * GET /v1/models/:model
 * Returns information about a specific model
 */
router.get('/models/:model', (req: Request, res: Response) => {
  const config = getConfig();
  const modelId = req.params.model;

  if (!config.isModelEnabled(modelId)) {
    res.status(404).json({
      error: {
        message: `Model '${modelId}' not found`,
        type: 'invalid_request_error',
        code: 404,
      },
    });
    return;
  }

  const modelInfo: ModelInfo = {
    id: modelId,
    object: 'model',
    owned_by: 'minimax',
    type: getModelType(modelId),
  };

  res.json(modelInfo);
});

export default router;
