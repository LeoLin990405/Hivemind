#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * HiveMind Standalone Web Server
 * 完全独立于 Electron 的 Node.js 服务器入口
 * Fully independent Node.js server entry point — no Electron dependency.
 *
 * Usage:
 *   npm run server:dev    # Development with auto-reload
 *   npm run server        # Production
 */

// 1. Mark standalone mode BEFORE any other imports
process.env.HIVEMIND_STANDALONE = '1';

// 2. Import standalone bridge adapter (replaces adapter/main.ts)
import './adapter/standalone';

// 3. Import storage initialization
import initStorage from './process/initStorage';

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       HiveMind Standalone Server                 ║');
  console.log('║       No Electron — Pure Node.js                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Initialize storage and database
  console.log('[Server] Initializing storage...');
  await initStorage();
  console.log('[Server] Storage initialized');

  // 4. Initialize server bridge handlers (lazy import to avoid hard crashes)
  await import('./process/initBridge.server');

  // Parse CLI arguments
  const port = parseInt(process.env.PORT || process.env.HIVEMIND_PORT || '25808', 10);
  const allowRemote = process.env.ALLOW_REMOTE === 'true' || process.argv.includes('--remote');

  // 5. Import webserver after bridge setup
  const { startWebServerWithInstance } = await import('./webserver');

  // Start Express + Socket.IO server
  console.log(`[Server] Starting web server on port ${port}...`);
  await startWebServerWithInstance(port, allowRemote);

  // Initialize optional services
  try {
    const { dailySyncService } = await import('./process/services/obsidian/DailySyncService');
    await dailySyncService.init();
  } catch (error) {
    console.error('[Server] Failed to initialize DailySyncService:', error);
  }

  try {
    const { getChannelManager } = await import('./channels');
    await getChannelManager().initialize();
  } catch (error) {
    console.error('[Server] Failed to initialize ChannelManager:', error);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Server] Ready in ${elapsed}ms`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  process.exit(0);
});

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
