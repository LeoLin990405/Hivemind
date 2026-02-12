/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Ollama provider metadata placeholder.
 *
 * Ollama 在当前架构中通过 Hivemind provider 统一路由。
 */
export const OLLAMA_AGENT = {
  id: 'ollama',
  name: 'Ollama',
  endpoint: 'http://localhost:11434',
  description: '本地大语言模型',
  capabilities: ['chat', 'local', 'offline', 'privacy'] as const,
};

export type OllamaAgentMeta = typeof OLLAMA_AGENT;

