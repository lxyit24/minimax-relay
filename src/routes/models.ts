// ============================================================
// MiniMax Relay Platform - Models Route
// ============================================================

import { Router, Request, Response } from 'express';
import { getConfig } from '../config';
import { ModelInfo } from '../types';

const router = Router();

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
    type: modelId.includes('image') ? 'image' : 'chat',
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
    type: modelId.includes('image') ? 'image' : 'chat',
  };

  res.json(modelInfo);
});

export default router;
