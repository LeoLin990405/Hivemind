/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Gateway API client library — re-exports from the original hivemind module.
 * New code should import from `@/agent/gateway` instead of `@/agent/hivemind`.
 */
export { HivemindConnection as GatewayConnection } from '../hivemind/HivemindConnection';
export { HivemindConnection } from '../hivemind/HivemindConnection';
export * from '../hivemind/types';
export { HivemindAdapter as GatewayAdapter } from '../hivemind/HivemindAdapter';
