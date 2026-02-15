/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesignTokens } from '@/renderer/design-system';

export const arcoThemeConfig = {
  primaryColor: DesignTokens.colors.primary[500],
  componentConfig: {
    Button: {
      style: {
        borderRadius: DesignTokens.radius.sm,
        transition: DesignTokens.transitions.base,
      },
    },
    Card: {
      style: {
        borderRadius: DesignTokens.radius.md,
        boxShadow: DesignTokens.shadows.md,
      },
    },
    Input: {
      style: {
        borderRadius: DesignTokens.radius.sm,
      },
    },
    Modal: {
      style: {
        borderRadius: DesignTokens.radius.lg,
      },
    },
  },
};
