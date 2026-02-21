/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standalone bridge adapter — no Electron dependency.
 * Uses only Socket.IO / WebSocket for communication.
 * Drop-in replacement for adapter/main.ts in standalone server mode.
 */

import { bridge } from '@office-ai/platform';

/**
 * WebSocket 广播函数类型
 * WebSocket broadcast function type
 */
type WebSocketBroadcastFn = (name: string, data: unknown) => void;

/**
 * 已注册的 WebSocket 广播函数列表
 * Registered WebSocket broadcast functions
 */
const webSocketBroadcasters: WebSocketBroadcastFn[] = [];

/**
 * 注册 WebSocket 广播函数（供 WebUI 服务器使用）
 * Register WebSocket broadcast function (for WebUI server)
 */
export function registerWebSocketBroadcaster(broadcastFn: WebSocketBroadcastFn): () => void {
  webSocketBroadcasters.push(broadcastFn);
  return () => {
    const index = webSocketBroadcasters.indexOf(broadcastFn);
    if (index > -1) {
      webSocketBroadcasters.splice(index, 1);
    }
  };
}

/**
 * Bridge emitter reference (captured at adapter init time)
 */
let bridgeEmitter: { emit: (name: string, data: unknown) => unknown } | null = null;

/**
 * 获取 bridge emitter（供 WebSocket 处理器使用）
 * Get bridge emitter (for WebSocket handler)
 */
export function getBridgeEmitter(): typeof bridgeEmitter {
  return bridgeEmitter;
}

/**
 * Standalone adapter — only broadcasts to WebSocket clients, no Electron IPC.
 */
bridge.adapter({
  emit(name, data) {
    for (const broadcast of webSocketBroadcasters) {
      try {
        broadcast(name, data);
      } catch (error) {
        console.error('[StandaloneAdapter] WebSocket broadcast error:', error);
      }
    }
  },
  on(emitter) {
    bridgeEmitter = emitter;
  },
});

console.log('[StandaloneAdapter] Bridge adapter initialized (Socket.IO only)');
