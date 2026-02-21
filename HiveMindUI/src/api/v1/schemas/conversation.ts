/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Conversation schemas
 */

// Conversation model
export const conversationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  platform: z.enum(['gemini', 'codex', 'claude', 'acp', 'hivemind', 'openclaw']),
  model: z.string().optional(),
  provider: z.string().optional(),
  workspace: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
  extra: z.record(z.any()).optional(),
});

export type Conversation = z.infer<typeof conversationSchema>;

// Create conversation request
export const createConversationRequestSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.enum(['gemini', 'codex', 'claude', 'acp', 'hivemind', 'openclaw']),
  model: z.string().optional(),
  provider: z.string().optional(),
  workspace: z.string().optional(),
  extra: z.record(z.any()).optional(),
});

export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>;

// Update conversation request
export const updateConversationRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  workspace: z.string().optional(),
  extra: z.record(z.any()).optional(),
});

export type UpdateConversationRequest = z.infer<typeof updateConversationRequestSchema>;

// Send message request
export const sendMessageRequestSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'url']),
        url: z.string().optional(),
        path: z.string().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
});

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

// Message model
export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().datetime(),
  toolCalls: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
});

export type Message = z.infer<typeof messageSchema>;

// List conversations query
export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  platform: z.enum(['gemini', 'codex', 'claude', 'acp', 'hivemind', 'openclaw']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

// Workspace file
export const workspaceFileSchema = z.object({
  path: z.string(),
  name: z.string(),
  type: z.enum(['file', 'directory']),
  size: z.number().optional(),
  modifiedAt: z.string().datetime().optional(),
});

export type WorkspaceFile = z.infer<typeof workspaceFileSchema>;
