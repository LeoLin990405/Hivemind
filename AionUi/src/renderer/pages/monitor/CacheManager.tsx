/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, Message, Modal, Space, Statistic } from '@arco-design/web-react';
import { IconDelete, IconRefresh } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import { useGatewayStats } from '@/renderer/hooks/useGatewayStats';
import { gatewayMonitorService } from '@/renderer/services/GatewayMonitorService';
import { DesignTokens } from '@/renderer/design-system';

const CacheManager: React.FC = () => {
  const { t } = useTranslation();
  const { cacheStats, loading, refresh } = useGatewayStats();
  const [clearing, setClearing] = useState(false);

  const isEnabled = useMemo(() => {
    if (cacheStats?.enabled === false) {
      return false;
    }
    return true;
  }, [cacheStats]);

  const handleClearCache = () => {
    Modal.confirm({
      title: t('monitor.cache.clearConfirmTitle', { defaultValue: 'Clear Cache?' }),
      content: t('monitor.cache.clearConfirmContent', {
        defaultValue: 'This will clear all cached responses. Are you sure?',
      }),
      onOk: async () => {
        setClearing(true);
        try {
          await gatewayMonitorService.clearCache();
          Message.success(t('monitor.cache.clearSuccess', { defaultValue: 'Cache cleared successfully' }));
          await refresh();
        } catch (error) {
          Message.error(error instanceof Error ? error.message : t('monitor.cache.clearError', { defaultValue: 'Failed to clear cache' }));
        } finally {
          setClearing(false);
        }
      },
    });
  };

  return (
    <div
      className='space-y-16px'
      style={{
        transition: DesignTokens.transitions.base,
      }}
    >
      <div className='flex items-center justify-between mb-16px'>
        <h1 className='text-20px font-600'>{t('monitor.cache.title', { defaultValue: 'Cache Management' })}</h1>
        <Space>
          <Button icon={<IconRefresh />} onClick={() => void refresh()} loading={loading}>
            {t('monitor.cache.refresh', { defaultValue: 'Refresh' })}
          </Button>
          <Button type='primary' status='danger' icon={<IconDelete />} onClick={handleClearCache} loading={clearing} disabled={!isEnabled}>
            {t('monitor.cache.clear', { defaultValue: 'Clear Cache' })}
          </Button>
        </Space>
      </div>

      <div className='grid grid-cols-4 gap-16px'>
        <Card>
          <Statistic title={t('monitor.cache.totalEntries', { defaultValue: 'Total Entries' })} value={cacheStats?.total_entries || 0} countUp />
        </Card>
        <Card>
          <Statistic
            title={t('monitor.cache.hitRate', { defaultValue: 'Hit Rate' })}
            value={(cacheStats?.hit_rate || 0) * 100}
            precision={1}
            suffix='%'
            countUp
            styleValue={{
              color: (cacheStats?.hit_rate || 0) > 0.7 ? DesignTokens.colors.success : DesignTokens.colors.warning,
            }}
          />
        </Card>
        <Card>
          <Statistic title={t('monitor.cache.totalHits', { defaultValue: 'Total Hits' })} value={cacheStats?.total_hits || 0} countUp />
        </Card>
        <Card>
          <Statistic title={t('monitor.cache.totalMisses', { defaultValue: 'Total Misses' })} value={cacheStats?.total_misses || 0} countUp />
        </Card>
      </div>

      <Card title={t('monitor.cache.description', { defaultValue: 'Cache Information' })}>
        <p className='text-t-secondary'>
          {isEnabled
            ? t('monitor.cache.descriptionContent', {
                defaultValue: 'The cache stores responses from AI providers to reduce latency and API costs. A higher hit rate indicates better cache efficiency.',
              })
            : t('monitor.cache.disabled', { defaultValue: 'Cache is currently disabled in Gateway config.' })}
        </p>
      </Card>
    </div>
  );
};

export default CacheManager;
