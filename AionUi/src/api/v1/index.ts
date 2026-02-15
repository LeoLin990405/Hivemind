/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import authRoutes from './routes/auth.routes';
// Import other routes as they are implemented
// import conversationRoutes from './routes/conversation.routes';
// import modelRoutes from './routes/model.routes';
// etc.

const router = Router();

/**
 * Mount v1 API routes
 */
router.use('/auth', authRoutes);
// router.use('/conversations', conversationRoutes);
// router.use('/models', modelRoutes);
// router.use('/providers', providerRoutes);
// router.use('/mcp', mcpRoutes);
// router.use('/skills', skillsRoutes);
// router.use('/cron', cronRoutes);
// router.use('/system', systemRoutes);

/**
 * Health check endpoint (no auth required)
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  });
});

export default router;
