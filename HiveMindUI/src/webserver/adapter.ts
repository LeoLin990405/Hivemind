/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Server as HTTPServer } from 'http';
import type { WebSocketServer } from 'ws';
import { WebSocketManager } from './websocket/WebSocketManager';
import { SocketIOManager } from './websocket/SocketIOManager';

// Dynamic adapter import: use standalone adapter in server mode, main adapter in Electron mode
type BroadcastFn = (name: string, data: unknown) => void;
type RegisterFn = (fn: BroadcastFn) => () => void;
type EmitterGetter = () => { emit: (name: string, data: unknown) => unknown } | null;

let _registerWebSocketBroadcaster: RegisterFn;
let _getBridgeEmitter: EmitterGetter;

if (process.env.HIVEMIND_STANDALONE === '1') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const standalone = require('../adapter/standalone') as { registerWebSocketBroadcaster: RegisterFn; getBridgeEmitter: EmitterGetter };
  _registerWebSocketBroadcaster = standalone.registerWebSocketBroadcaster;
  _getBridgeEmitter = standalone.getBridgeEmitter;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const main = require('../adapter/main') as { registerWebSocketBroadcaster: RegisterFn; getBridgeEmitter: EmitterGetter };
  _registerWebSocketBroadcaster = main.registerWebSocketBroadcaster;
  _getBridgeEmitter = main.getBridgeEmitter;
}

// Re-export for other modules that import from here
export const registerWebSocketBroadcaster = _registerWebSocketBroadcaster;
export const getBridgeEmitter = _getBridgeEmitter;

// 存储管理器实例和取消注册函数
// Store manager instance and unregister function for cleanup
let currentManager: WebSocketManager | SocketIOManager | null = null;
let unregisterBroadcaster: (() => void) | null = null;

/**
 * 初始化 Web 适配器 - 建立 WebSocket 与 bridge 的通信桥梁 (原生 ws)
 * Initialize Web Adapter - Bridge communication between WebSocket and platform bridge (native ws)
 *
 * 注意：不再调用 bridge.adapter()，而是注册到主适配器
 * Note: No longer calling bridge.adapter(), instead registering with main adapter
 * 这样可以避免覆盖 Electron IPC 适配器
 * This avoids overwriting the Electron IPC adapter
 */
export function initWebAdapter(wss: WebSocketServer): void {
  const wsManager = new WebSocketManager(wss);
  wsManager.initialize();
  currentManager = wsManager;

  // 注册 WebSocket 广播函数到主适配器
  // Register WebSocket broadcast function to main adapter
  unregisterBroadcaster = registerWebSocketBroadcaster((name, data) => {
    wsManager.broadcast(name, data);
  });

  // 设置 WebSocket 消息处理器，将消息转发到 bridge emitter
  // Setup WebSocket message handler to forward messages to bridge emitter
  wsManager.setupConnectionHandler((name, data, _ws) => {
    const emitter = getBridgeEmitter();
    if (emitter) {
      emitter.emit(name, data);
    }
  });

  console.log('[WebAdapter] Initialized with native WebSocket (ws)');
}

/**
 * 初始化 Socket.IO 适配器 - 使用 Socket.IO 进行实时通信
 * Initialize Socket.IO Adapter - Use Socket.IO for real-time communication
 */
export function initSocketIOAdapter(httpServer: HTTPServer): void {
  const socketIOManager = new SocketIOManager();
  socketIOManager.initialize(httpServer);
  currentManager = socketIOManager;

  // 注册 Socket.IO 广播函数到主适配器
  // Register Socket.IO broadcast function to main adapter
  unregisterBroadcaster = registerWebSocketBroadcaster((name, data) => {
    socketIOManager.broadcast(name, data);
  });

  // Socket.IO 事件处理 - 将所有客户端事件转发到 bridge emitter
  // Socket.IO event handling - forward ALL client events to bridge emitter
  const io = socketIOManager.getIO();
  if (io) {
    io.on('connection', (socket) => {
      const emitter = getBridgeEmitter();
      if (!emitter) return;

      // 使用 onAny 通用转发，与 WebSocketManager 的行为一致
      // Use onAny for generic forwarding, consistent with WebSocketManager behavior
      socket.onAny((eventName: string, data: unknown) => {
        // 跳过 Socket.IO 内部事件和心跳/认证事件（已由 SocketIOManager 处理）
        // Skip internal Socket.IO events and heartbeat/auth events (handled by SocketIOManager)
        if (eventName === 'pong' || eventName === 'auth:refresh') return;
        emitter.emit(eventName, data);
      });
    });
  }

  console.log('[WebAdapter] Initialized with Socket.IO');
}

/**
 * 获取当前管理器实例
 * Get current manager instance
 */
export function getCurrentManager(): WebSocketManager | SocketIOManager | null {
  return currentManager;
}

/**
 * 清理 Web 适配器（服务器停止时调用）
 * Cleanup Web Adapter (called when server stops)
 */
export function cleanupWebAdapter(): void {
  if (unregisterBroadcaster) {
    unregisterBroadcaster();
    unregisterBroadcaster = null;
  }

  if (currentManager) {
    currentManager.destroy();
    currentManager = null;
  }

  console.log('[WebAdapter] Cleaned up');
}
