/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { successResponseSchema, errorResponseSchema, paginatedResponseSchema } from './schemas/common';
import { registerRequestSchema, loginRequestSchema, authResponseSchema } from './schemas/auth';
import { conversationSchema, createConversationRequestSchema, messageSchema, sendMessageRequestSchema } from './schemas/conversation';
import { modelSchema, providerSchema, createModelRequestSchema, createProviderRequestSchema } from './schemas/model';

export function generateOpenAPISpec() {
  const registry = new OpenAPIRegistry();

  // Register security scheme
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  // Register common schemas
  registry.register('SuccessResponse', successResponseSchema(conversationSchema));
  registry.register('ErrorResponse', errorResponseSchema);
  registry.register('PaginatedResponse', paginatedResponseSchema(conversationSchema));

  // Register auth schemas
  registry.register('RegisterRequest', registerRequestSchema);
  registry.register('LoginRequest', loginRequestSchema);
  registry.register('AuthResponse', authResponseSchema);

  // Register conversation schemas
  registry.register('Conversation', conversationSchema);
  registry.register('CreateConversationRequest', createConversationRequestSchema);
  registry.register('Message', messageSchema);
  registry.register('SendMessageRequest', sendMessageRequestSchema);

  // Register model schemas
  registry.register('Model', modelSchema);
  registry.register('Provider', providerSchema);
  registry.register('CreateModelRequest', createModelRequestSchema);
  registry.register('CreateProviderRequest', createProviderRequestSchema);

  // Register paths (examples - full implementation in separate files)

  // Auth endpoints
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Authentication'],
    summary: 'Register new user',
    request: {
      body: {
        content: {
          'application/json': {
            schema: registerRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User registered successfully',
        content: {
          'application/json': {
            schema: successResponseSchema(authResponseSchema),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Authentication'],
    summary: 'Login with credentials',
    request: {
      body: {
        content: {
          'application/json': {
            schema: loginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: successResponseSchema(authResponseSchema),
          },
        },
      },
      401: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  // Conversation endpoints
  registry.registerPath({
    method: 'get',
    path: '/api/v1/conversations',
    tags: ['Conversations'],
    summary: 'List all conversations',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of conversations',
        content: {
          'application/json': {
            schema: paginatedResponseSchema(conversationSchema),
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/conversations',
    tags: ['Conversations'],
    summary: 'Create new conversation',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: createConversationRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Conversation created',
        content: {
          'application/json': {
            schema: successResponseSchema(conversationSchema),
          },
        },
      },
    },
  });

  // Generate OpenAPI document
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Hivemind API',
      version: '1.0.0',
      description: 'Multi-AI Collaboration Platform API',
      contact: {
        name: 'Hivemind',
        email: 'service@hivemind.com',
      },
      license: {
        name: 'Apache-2.0',
        url: 'https://www.apache.org/licenses/LICENSE-2.0',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.hivemind.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Conversations', description: 'Conversation management' },
      { name: 'Messages', description: 'Message operations' },
      { name: 'Files', description: 'File operations' },
      { name: 'Models', description: 'AI model management' },
      { name: 'Providers', description: 'Provider management' },
      { name: 'MCP', description: 'MCP server management' },
      { name: 'Skills', description: 'Skills management' },
      { name: 'Cron', description: 'Scheduled jobs' },
      { name: 'System', description: 'System information' },
    ],
  });
}
