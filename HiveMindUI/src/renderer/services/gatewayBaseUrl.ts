/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const GATEWAY_PROXY_BASE_URL = '/api/gateway';

const LOCAL_GATEWAY_BASES = new Set(['http://localhost:8765', 'http://127.0.0.1:8765']);

function normalizeGatewayBaseUrl(rawUrl: string): string | null {
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

export function resolveGatewayBaseUrl(gatewayUrl?: string | null): string {
  if (!gatewayUrl || !gatewayUrl.trim()) {
    return GATEWAY_PROXY_BASE_URL;
  }

  const normalized = normalizeGatewayBaseUrl(gatewayUrl.trim());
  if (!normalized) {
    return GATEWAY_PROXY_BASE_URL;
  }

  if (LOCAL_GATEWAY_BASES.has(normalized)) {
    return GATEWAY_PROXY_BASE_URL;
  }

  return normalized;
}
