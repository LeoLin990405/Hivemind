/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

const rawFlag = `${process.env.NEXUS_UI_ENABLED ?? 'false'}`.toLowerCase();

export const NEXUS_UI_ENABLED = !['0', 'false', 'off', 'no'].includes(rawFlag);
export const UI_MODE = NEXUS_UI_ENABLED ? 'nexus' : 'hivemindui';
