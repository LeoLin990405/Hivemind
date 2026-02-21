/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Electron-free path resolution module.
 * Used by standalone server mode; Electron mode falls back to app.getPath().
 */

import path from 'path';
import os from 'os';

/**
 * Get application data path (equivalent to Electron's app.getPath('userData') + '/hivemind')
 * Priority: HIVEMIND_DATA_DIR env → ~/.hivemind
 */
export const getAppDataPath = (): string => {
  if (process.env.HIVEMIND_DATA_DIR) return process.env.HIVEMIND_DATA_DIR;
  return path.join(os.homedir(), '.hivemind');
};

/**
 * Get application config path (equivalent to Electron's app.getPath('userData') + '/config')
 * Priority: HIVEMIND_CONFIG_DIR env → ~/.hivemind-config
 */
export const getAppConfigPath = (): string => {
  if (process.env.HIVEMIND_CONFIG_DIR) return process.env.HIVEMIND_CONFIG_DIR;
  return path.join(os.homedir(), '.hivemind-config');
};

/**
 * Get temp path
 * Priority: HIVEMIND_TEMP_DIR env → os.tmpdir()/hivemind
 */
export const getAppTempPath = (): string => {
  if (process.env.HIVEMIND_TEMP_DIR) return process.env.HIVEMIND_TEMP_DIR;
  return path.join(os.tmpdir(), 'hivemind');
};

/**
 * Get application root path (equivalent to Electron's app.getAppPath())
 * Priority: HIVEMIND_APP_DIR env → process.cwd()
 */
export const getAppRootPath = (): string => {
  return process.env.HIVEMIND_APP_DIR || process.cwd();
};

/**
 * Get user data path (equivalent to Electron's app.getPath('userData'))
 * On macOS: ~/Library/Application Support/HiveMind
 * On Linux: ~/.config/HiveMind
 * On Windows: %APPDATA%/HiveMind
 * Priority: HIVEMIND_USER_DATA_DIR env → platform default
 */
export const getAppUserDataPath = (): string => {
  if (process.env.HIVEMIND_USER_DATA_DIR) return process.env.HIVEMIND_USER_DATA_DIR;
  const platform = process.platform;
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'HiveMind');
  } else if (platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'HiveMind');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'HiveMind');
};

/**
 * Get home path
 */
export const getAppHomePath = (): string => {
  return os.homedir();
};

/**
 * In standalone mode, app is never packaged
 */
export const isPackaged = (): boolean => false;

/**
 * Check if running in standalone (non-Electron) mode
 */
export const isStandalone = (): boolean => {
  return process.env.HIVEMIND_STANDALONE === '1';
};
