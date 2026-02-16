/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Common response wrapper schemas
 */

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
    }),
  });

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'RATE_LIMIT_EXCEEDED', 'INTERNAL_ERROR']),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
        })
      )
      .optional(),
  }),
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().uuid(),
  }),
});

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: paginationSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
    }),
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationResponse = z.infer<typeof paginationSchema>;
