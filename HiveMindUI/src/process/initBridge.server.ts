/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side bridge initialization — skips Electron-only bridges.
 * Used by standalone server mode (src/server.ts).
 */

import { logger } from '@office-ai/platform';

// Skipped bridges (require Electron native APIs):
// - initDialogBridge — uses BrowserWindow + dialog (Web uses <input type="file">)
// - initWindowControlsBridge — uses BrowserWindow minimize/maximize/close
// - initUpdateBridge — uses Electron autoUpdater

logger.config({ print: true });

type BridgeInitConfig = {
  name: string;
  modulePath: string;
  exportName: string;
  required?: boolean;
};

const BRIDGES: BridgeInitConfig[] = [
  { name: 'shell', modulePath: './bridge/shellBridge', exportName: 'initShellBridge' },
  { name: 'filesystem', modulePath: './bridge/fsBridge', exportName: 'initFsBridge' },
  { name: 'file-watch', modulePath: './bridge/fileWatchBridge', exportName: 'initFileWatchBridge' },
  { name: 'application', modulePath: './bridge/applicationBridge', exportName: 'initApplicationBridge' },
  { name: 'auth', modulePath: './bridge/authBridge', exportName: 'initAuthBridge' },
  { name: 'model', modulePath: './bridge/modelBridge', exportName: 'initModelBridge' },
  { name: 'models', modulePath: './bridge/modelsBridge', exportName: 'initModelsBridge' },
  { name: 'database', modulePath: './bridge/databaseBridge', exportName: 'initDatabaseBridge' },
  { name: 'document', modulePath: './bridge/documentBridge', exportName: 'initDocumentBridge' },
  { name: 'preview-history', modulePath: './bridge/previewHistoryBridge', exportName: 'initPreviewHistoryBridge' },
  { name: 'skills', modulePath: './bridge/skillsBridge', exportName: 'initSkillsBridge' },
  { name: 'tools', modulePath: './bridge/toolsBridge', exportName: 'initToolsBridge' },
  { name: 'sync', modulePath: './bridge/syncBridge', exportName: 'initSyncBridge' },
  { name: 'webui', modulePath: './bridge/webuiBridge', exportName: 'initWebuiBridge', required: true },
  { name: 'channel', modulePath: './bridge/channelBridge', exportName: 'initChannelBridge' },
  { name: 'obsidian', modulePath: './bridge/obsidianBridge', exportName: 'initObsidianBridge' },
  { name: 'notebooklm', modulePath: './bridge/notebooklmBridge', exportName: 'initNotebookLMBridge' },
  { name: 'mcp', modulePath: './bridge/mcpBridge', exportName: 'initMcpBridge' },
  { name: 'agent-teams', modulePath: './bridge/agentTeamsBridge', exportName: 'initAgentTeamsBridge' },
  { name: 'gemini', modulePath: './bridge/geminiBridge', exportName: 'initGeminiBridge' },
  { name: 'conversation', modulePath: './bridge/conversationBridge', exportName: 'initConversationBridge' },
  { name: 'codex-conversation', modulePath: './bridge/codexConversationBridge', exportName: 'initCodexConversationBridge' },
  { name: 'gemini-conversation', modulePath: './bridge/geminiConversationBridge', exportName: 'initGeminiConversationBridge' },
  { name: 'acp-conversation', modulePath: './bridge/acpConversationBridge', exportName: 'initAcpConversationBridge' },
  { name: 'cron', modulePath: './bridge/cronBridge', exportName: 'initCronBridge' },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function loadAndInitBridge(config: BridgeInitConfig): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleRef = require(config.modulePath) as Record<string, unknown>;
    const initFn = moduleRef[config.exportName];
    if (typeof initFn !== 'function') {
      throw new Error(`Missing export "${config.exportName}"`);
    }

    (initFn as () => void)();
    console.log(`[Server] Bridge initialized: ${config.name}`);
    return true;
  } catch (error) {
    const message = toErrorMessage(error);
    if (config.required) {
      console.error(`[Server] Bridge failed (required): ${config.name} - ${message}`);
    } else {
      console.warn(`[Server] Bridge skipped: ${config.name} - ${message}`);
    }
    return false;
  }
}

function initOptionalCronService(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cronService } = require('./services/cron/CronService') as {
      cronService: { init: () => Promise<void> };
    };

    void cronService.init().catch((error: unknown) => {
      console.warn(`[Server] Cron service init failed: ${toErrorMessage(error)}`);
    });
  } catch (error) {
    console.warn(`[Server] Cron service disabled in standalone mode: ${toErrorMessage(error)}`);
  }
}

/**
 * Initialize all server-compatible bridges
 */
export function initAllServerBridges(): void {
  console.log('[Server] Initializing bridges (standalone mode)...');
  let requiredFailures = 0;

  for (const bridge of BRIDGES) {
    const ok = loadAndInitBridge(bridge);
    if (!ok && bridge.required) {
      requiredFailures += 1;
    }
  }

  initOptionalCronService();

  if (requiredFailures > 0) {
    throw new Error(`Failed to initialize ${requiredFailures} required bridge(s)`);
  }

  console.log('[Server] Bridge initialization completed');
}

// Auto-initialize when imported
initAllServerBridges();
