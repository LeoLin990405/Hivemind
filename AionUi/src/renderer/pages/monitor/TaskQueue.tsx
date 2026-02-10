/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, Space, Table, Tag } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import { gatewayMonitorService, type Task } from '@/renderer/services/GatewayMonitorService';

const TaskQueue: React.FC = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await gatewayMonitorService.getTasks(50);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => (statusFilter === 'all' ? true : task.status === statusFilter));
  }, [statusFilter, tasks]);

  const columns = [
    {
      title: t('monitor.tasks.id', { defaultValue: 'Task ID' }),
      dataIndex: 'id',
      key: 'id',
      width: 220,
      render: (val: string) => <code className='text-12px'>{val.slice(0, 12)}...</code>,
    },
    {
      title: t('monitor.tasks.status', { defaultValue: 'Status' }),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (val: string) => {
        const colorMap = {
          pending: 'orange',
          completed: 'green',
          failed: 'red',
        } as const;
        return <Tag color={colorMap[val as keyof typeof colorMap] || 'gray'}>{val}</Tag>;
      },
    },
    {
      title: t('monitor.tasks.provider', { defaultValue: 'Provider' }),
      dataIndex: 'provider',
      key: 'provider',
      width: 140,
    },
    {
      title: t('monitor.tasks.createdAt', { defaultValue: 'Created At' }),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 200,
      render: (val: string) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: t('monitor.tasks.completedAt', { defaultValue: 'Completed At' }),
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 200,
      render: (val?: string | null) => (val ? new Date(val).toLocaleString() : '-'),
    },
    {
      title: t('monitor.tasks.error', { defaultValue: 'Error' }),
      dataIndex: 'error',
      key: 'error',
      render: (val?: string | null) => (val ? <span className='text-red-600'>{val}</span> : '-'),
    },
  ];

  return (
    <div className='space-y-16px'>
      <div className='flex items-center justify-between mb-16px'>
        <h1 className='text-20px font-600'>{t('monitor.tasks.title', { defaultValue: 'Task Queue' })}</h1>
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: t('monitor.tasks.all', { defaultValue: 'All' }), value: 'all' },
              { label: t('monitor.tasks.pending', { defaultValue: 'Pending' }), value: 'pending' },
              { label: t('monitor.tasks.completed', { defaultValue: 'Completed' }), value: 'completed' },
              { label: t('monitor.tasks.failed', { defaultValue: 'Failed' }), value: 'failed' },
            ]}
            style={{ width: 140 }}
          />
          <Button icon={<IconRefresh />} onClick={() => void refresh()} loading={loading}>
            {t('monitor.tasks.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} data={filteredTasks} pagination={{ pageSize: 20 }} loading={loading} rowKey='id' />
      </Card>
    </div>
  );
};

export default TaskQueue;
