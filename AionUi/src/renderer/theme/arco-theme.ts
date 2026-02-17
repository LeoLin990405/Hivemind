/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { tokens } from '@/renderer/design-tokens';

export const arcoThemeConfig = {
  primaryColor: tokens.colors.accent.light,
  componentConfig: {
    Button: {
      style: {
        borderRadius: tokens.radius.sm,
        transition: tokens.transitions.base,
      },
    },
    Card: {
      style: {
        borderRadius: tokens.radius.md,
        boxShadow: tokens.shadows.md,
      },
    },
    Input: {
      style: {
        borderRadius: tokens.radius.sm,
      },
    },
    Modal: {
      style: {
        borderRadius: tokens.radius.lg,
      },
    },
  },
};
