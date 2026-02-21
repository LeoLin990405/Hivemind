/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'child_process';
import { ipcBridge } from '../../common';

// Dynamic Electron import
let _shell: typeof import('electron').shell | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _shell = require('electron').shell;
  if (typeof _shell?.openPath !== 'function') _shell = null;
} catch {
  _shell = null;
}

/**
 * Standalone fallback: open a file/URL using platform command
 */
function openWithPlatformCommand(target: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd =
      process.platform === 'darwin'
        ? `open "${target}"`
        : process.platform === 'win32'
          ? `start "" "${target}"`
          : `xdg-open "${target}"`;
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

export function initShellBridge(): void {
  ipcBridge.shell.openFile.provider(async (path) => {
    if (_shell) {
      await _shell.openPath(path);
    } else {
      await openWithPlatformCommand(path);
    }
  });

  ipcBridge.shell.showItemInFolder.provider((path) => {
    if (_shell) {
      _shell.showItemInFolder(path);
    }
    // In standalone mode, this is a no-op (Web UI uses its own file browser)
    return Promise.resolve();
  });

  ipcBridge.shell.openExternal.provider((url) => {
    if (_shell) {
      return _shell.openExternal(url);
    }
    return openWithPlatformCommand(url);
  });
}
