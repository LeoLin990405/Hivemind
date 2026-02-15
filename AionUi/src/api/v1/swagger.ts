/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPISpec } from './openapi';

/**
 * Setup Swagger UI documentation
 */
export function setupSwagger(app: Express): void {
  const openApiSpec = generateOpenAPISpec();

  // Serve OpenAPI spec as JSON
  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // Serve Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Hivemind API Documentation',
      customfavIcon: '/favicon.ico',
    })
  );

  console.log('📚 API Documentation available at /api/docs');
}
