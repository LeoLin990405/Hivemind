/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Model and Provider schemas
 */

// Provider model
export const providerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['openai', 'anthropic', 'google', 'custom']),
  apiKey: z.string().optional(), // Masked in responses
  baseUrl: z.string().url().optional(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Provider = z.infer<typeof providerSchema>;

// Model model
export const modelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  providerId: z.string().uuid(),
  modelId: z.string(), // External model ID (e.g., "gpt-4")
  capabilities: z.object({
    chat: z.boolean().default(true),
    vision: z.boolean().default(false),
    functionCalling: z.boolean().default(false),
    streaming: z.boolean().default(true),
  }),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Model = z.infer<typeof modelSchema>;

// Create provider request
export const createProviderRequestSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['openai', 'anthropic', 'google', 'custom']),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
});

export type CreateProviderRequest = z.infer<typeof createProviderRequestSchema>;

// Update provider request
export const updateProviderRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
});

export type UpdateProviderRequest = z.infer<typeof updateProviderRequestSchema>;

// Create model request
export const createModelRequestSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  providerId: z.string().uuid(),
  modelId: z.string(),
  capabilities: z
    .object({
      chat: z.boolean().default(true),
      vision: z.boolean().default(false),
      functionCalling: z.boolean().default(false),
      streaming: z.boolean().default(true),
    })
    .optional(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  enabled: z.boolean().default(true),
});

export type CreateModelRequest = z.infer<typeof createModelRequestSchema>;

// Update model request
export const updateModelRequestSchema = createModelRequestSchema.partial().omit({ providerId: true });

export type UpdateModelRequest = z.infer<typeof updateModelRequestSchema>;
