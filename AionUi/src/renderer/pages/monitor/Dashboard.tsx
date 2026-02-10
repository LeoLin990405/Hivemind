/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Alert, Button, Card, Space, Spin, Statistic, Table } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import { useGatewayStats } from '@/renderer/hooks/useGatewayStats';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { stats, cacheStats, loading, error, refresh } = useGatewayStats();

  if (loading && !stats) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Spin size={40} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Alert
        type='error'
        title={t('monitor.dashboard.error', { defaultValue: 'Failed to load monitoring data' })}
        content={error}
        action={
          <Button size='small' onClick={() => void refresh()}>
            {t('monitor.dashboard.retry', { defaultValue: 'Retry' })}
          </Button>
        }
      />
    );
  }

  const columns = [
    {
      title: t('monitor.dashboard.provider', { defaultValue: 'Provider' }),
      dataIndex: 'provider',
      key: 'provider',
    },
    {
      title: t('monitor.dashboard.requests', { defaultValue: 'Requests' }),
      dataIndex: 'requests',
      key: 'requests',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: t('monitor.dashboard.successRate', { defaultValue: 'Success Rate' }),
      dataIndex: 'success_rate',
      key: 'success_rate',
      render: (val: number) => <span className={val > 0.9 ? 'text-green-600' : 'text-red-600'}>{(val * 100).toFixed(1)}%</span>,
    },
    {
      title: t('monitor.dashboard.avgLatency', { defaultValue: 'Avg Latency' }),
      dataIndex: 'avg_latency_ms',
      key: 'avg_latency_ms',
      render: (val: number) => `${val.toFixed(0)}ms`,
    },
    {
      title: t('monitor.dashboard.errors', { defaultValue: 'Errors' }),
      dataIndex: 'errors',
      key: 'errors',
      render: (val: number) => <span className={val > 0 ? 'text-red-600' : ''}>{val.toLocaleString()}</span>,
    },
  ];

  return (
    <div className='space-y-16px'>
      <div className='flex items-center justify-between mb-16px'>
        <h1 className='text-20px font-600'>{t('monitor.dashboard.title', { defaultValue: 'Overview' })}</h1>
        <Space>
          <Button icon={<IconRefresh />} onClick={() => void refresh()} loading={loading}>
            {t('monitor.dashboard.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Space>
      </div>

      <div className='grid grid-cols-4 gap-16px'>
        <Card>
          <Statistic title={t('monitor.dashboard.totalRequests', { defaultValue: 'Total Requests' })} value={stats?.total_requests || 0} countUp />
        </Card>
        <Card>
          <Statistic
            title={t('monitor.dashboard.overallSuccessRate', { defaultValue: 'Success Rate' })}
            value={(stats?.overall_success_rate || 0) * 100}
            precision={1}
            suffix='%'
            countUp
            styleValue={{
              color: (stats?.overall_success_rate || 0) > 0.9 ? '#00b42a' : '#f53f3f',
            }}
          />
        </Card>
        <Card>
          <Statistic title={t('monitor.dashboard.cacheEntries', { defaultValue: 'Cache Entries' })} value={cacheStats?.total_entries || 0} countUp />
        </Card>
        <Card>
          <Statistic
            title={t('monitor.dashboard.cacheHitRate', { defaultValue: 'Cache Hit Rate' })}
            value={(cacheStats?.hit_rate || 0) * 100}
            precision={1}
            suffix='%'
            countUp
            styleValue={{
              color: (cacheStats?.hit_rate || 0) > 0.7 ? '#00b42a' : '#ff7d00',
            }}
          />
        </Card>
      </div>

      <Card title={t('monitor.dashboard.providerPerformance', { defaultValue: 'Provider Performance' })}>
        <Table columns={columns} data={stats?.providers || []} pagination={false} loading={loading} rowKey='provider' />
      </Card>
    </div>
  );
};

export default Dashboard;
