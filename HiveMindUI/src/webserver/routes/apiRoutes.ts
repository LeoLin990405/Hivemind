/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, NextFunction, Request, Response } from 'express';
import { TokenMiddleware } from '@/webserver/auth/middleware/TokenMiddleware';
import directoryApi from '../directoryApi';
import { apiRateLimiter } from '../middleware/security';

const DEFAULT_GATEWAY_BASE_URL = 'http://127.0.0.1:8765';

function normalizeGatewayBaseUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

function resolveGatewayBaseUrl(req: Request): string {
  const queryValue = typeof req.query.gatewayBaseUrl === 'string' ? req.query.gatewayBaseUrl : undefined;
  const headerValue = typeof req.headers['x-gateway-base-url'] === 'string' ? req.headers['x-gateway-base-url'] : undefined;
  const envValue = process.env.HIVEMIND_GATEWAY_BASE_URL;

  return normalizeGatewayBaseUrl(queryValue) || normalizeGatewayBaseUrl(headerValue) || normalizeGatewayBaseUrl(envValue) || DEFAULT_GATEWAY_BASE_URL;
}

function getProxyBody(req: Request): BodyInit | undefined {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  const contentTypeHeader = req.headers['content-type'];
  const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader.toLowerCase() : '';

  if (contentType.includes('multipart/form-data')) {
    return req as unknown as BodyInit;
  }

  if (contentType.includes('application/x-www-form-urlencoded') && typeof req.body === 'object' && req.body !== null) {
    return new URLSearchParams(req.body as Record<string, string>).toString();
  }

  if (contentType.includes('application/json')) {
    if (typeof req.body === 'string') {
      return req.body;
    }
    return JSON.stringify(req.body ?? {});
  }

  if (typeof req.body === 'string' || req.body instanceof Buffer) {
    return req.body as BodyInit;
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  return undefined;
}

async function proxyGatewayRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gatewayBaseUrl = resolveGatewayBaseUrl(req);
    const upstreamPath = req.url?.startsWith('/') ? req.url : `/${req.url || ''}`;
    const targetUrl = `${gatewayBaseUrl}${upstreamPath}`;

    const headers = new Headers();
    const contentTypeHeader = req.headers['content-type'];
    if (typeof contentTypeHeader === 'string' && contentTypeHeader.trim()) {
      headers.set('content-type', contentTypeHeader);
    }

    const acceptHeader = req.headers.accept;
    if (typeof acceptHeader === 'string' && acceptHeader.trim()) {
      headers.set('accept', acceptHeader);
    }

    const body = getProxyBody(req);
    const requestInit: RequestInit & { duplex?: 'half' } = {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    };

    if (body && typeof body === 'object' && 'pipe' in (body as object)) {
      requestInit.duplex = 'half';
    }

    const upstreamResponse = await fetch(targetUrl, requestInit);
    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.status(upstreamResponse.status).send(responseBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * 注册 API 路由
 * Register API routes
 */
export function registerApiRoutes(app: Express): void {
  const validateApiAccess = TokenMiddleware.validateToken({ responseType: 'json' });

  /**
   * Gateway Proxy API
   * /api/gateway/*
   */
  app.use('/api/gateway', apiRateLimiter, validateApiAccess, (req: Request, res: Response, next: NextFunction) => {
    void proxyGatewayRequest(req, res, next);
  });

  /**
   * 目录 API - Directory API
   * /api/directory/*
   */
  app.use('/api/directory', apiRateLimiter, validateApiAccess, directoryApi);

  /**
   * 通用 API 端点 - Generic API endpoint
   * GET /api
   */
  app.use('/api', apiRateLimiter, validateApiAccess, (_req: Request, res: Response) => {
    res.json({ message: 'API endpoint - bridge integration working' });
  });
}

export default registerApiRoutes;
