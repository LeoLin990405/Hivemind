/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '../../common';
import { getSystemDir, ProcessEnv } from '../initStorage';
import { copyDirectoryRecursively } from '../utils';

// Dynamic Electron import
let _electronApp: typeof import('electron').app | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _electronApp = require('electron').app;
  if (typeof _electronApp?.relaunch !== 'function') _electronApp = null;
} catch {
  _electronApp = null;
}

// Dynamic WorkerManage import (may depend on Electron internals)
let WorkerManage: { clear: () => void } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WorkerManage = require('../WorkerManage').default;
} catch {
  WorkerManage = null;
}

// Dynamic zoom utils import (may depend on Electron BrowserWindow)
let _getZoomFactor: (() => number) | null = null;
let _setZoomFactor: ((factor: number) => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zoom = require('../utils/zoom');
  _getZoomFactor = zoom.getZoomFactor;
  _setZoomFactor = zoom.setZoomFactor;
} catch {
  // Zoom not available in standalone mode
}

export function initApplicationBridge(): void {
  ipcBridge.application.restart.provider(() => {
    if (WorkerManage) WorkerManage.clear();

    if (_electronApp) {
      _electronApp.relaunch();
      _electronApp.exit(0);
    } else {
      // Standalone mode: exit and let process manager (PM2/systemd) restart
      console.log('[ApplicationBridge] Restarting standalone server...');
      process.exit(0);
    }
    return Promise.resolve();
  });

  ipcBridge.application.updateSystemInfo.provider(async ({ cacheDir, workDir }) => {
    try {
      const oldDir = getSystemDir();
      if (oldDir.cacheDir !== cacheDir) {
        await copyDirectoryRecursively(oldDir.cacheDir, cacheDir);
      }
      await ProcessEnv.set('hivemind.dir', { cacheDir, workDir });
      return { success: true };
    } catch (e) {
      return { success: false, msg: e.message || e.toString() };
    }
  });

  ipcBridge.application.systemInfo.provider(() => {
    return Promise.resolve(getSystemDir());
  });

  ipcBridge.application.openDevTools.provider(() => {
    // No-op in standalone mode
    return Promise.resolve();
  });

  ipcBridge.application.getZoomFactor.provider(() => {
    return Promise.resolve(_getZoomFactor ? _getZoomFactor() : 1.0);
  });

  ipcBridge.application.setZoomFactor.provider(({ factor }) => {
    if (_setZoomFactor) _setZoomFactor(factor);
    return Promise.resolve(factor);
  });
}
