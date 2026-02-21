/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@arco-design/web-react';
import { PROVIDER_TIERS } from '@/agent/hivemind/types';
import { tokens } from '@/renderer/design-tokens';

interface ProviderBadgeProps {
  provider: string;
  cached?: boolean;
  latencyMs?: number | null;
  totalTokens?: number | null;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider, cached = false, latencyMs, totalTokens }) => {
  const { t } = useTranslation();
  const tier = PROVIDER_TIERS[provider] || { emoji: '🤖', label: 'Unknown', color: 'gray' };

  return (
    <div
      className='flex items-center gap-6px mb-6px'
      style={{
        transition: tokens.transitions.fast,
        padding: tokens.spacing.xs,
        borderRadius: tokens.radius.md,
      }}
    >
      <Tag color={tier.color} size='small'>
        {tier.emoji} {provider}
      </Tag>
      <Tag size='small'>{tier.label}</Tag>
      {cached && (
        <Tag color='green' size='small'>
          {t('hivemind.cached')}
        </Tag>
      )}
      {typeof latencyMs === 'number' && Number.isFinite(latencyMs) && <Tag size='small'>{(latencyMs / 1000).toFixed(1)}s</Tag>}
      {typeof totalTokens === 'number' && totalTokens > 0 && <Tag size='small'>⚡ {t('hivemind.tokens', { count: totalTokens })}</Tag>}
    </div>
  );
};

export default ProviderBadge;
