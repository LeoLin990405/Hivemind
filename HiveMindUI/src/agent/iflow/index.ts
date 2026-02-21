/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * iFlow provider metadata placeholder.
 *
 * iFlow 目前通过 Hivemind 网关路由，不在这里直接发起会话。
 */
export const IFLOW_AGENT = {
  id: 'iflow',
  name: 'iFlow',
  description: '工作流自动化 AI',
  capabilities: ['workflow', 'automation', 'task-planning'] as const,
};

export type IflowAgentMeta = typeof IFLOW_AGENT;
