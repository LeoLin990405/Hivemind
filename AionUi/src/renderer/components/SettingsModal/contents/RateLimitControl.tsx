/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Message, Space, Tag, Typography } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';
import { GatewayMonitorService, gatewayMonitorService, type RateLimitStatus } from '@/renderer/services/GatewayMonitorService';

type RateLimitControlProps = {
  gatewayUrl?: string;
};

const RateLimitControl: React.FC<RateLimitControlProps> = ({ gatewayUrl }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const service = useMemo(() => {
    if (gatewayUrl && gatewayUrl.trim().length > 0) {
      return new GatewayMonitorService(gatewayUrl);
    }
    return gatewayMonitorService;
  }, [gatewayUrl]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await service.getRateLimitStatus();
      setStatus(data);
    } catch (error) {
      Message.error(error instanceof Error ? error.message : t('hivemind.settings.rateLimitError', { defaultValue: 'Failed to load rate limit status' }));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (provider: string) => {
    try {
      await service.resetRateLimit(provider);
      Message.success(
        t('hivemind.settings.rateLimitResetSuccess', {
          provider,
          defaultValue: `${provider} rate limit reset`,
        })
      );
      await refresh();
    } catch (error) {
      Message.error(
        error instanceof Error
          ? error.message
          : t('hivemind.settings.rateLimitResetError', {
              provider,
              defaultValue: `Failed to reset ${provider} rate limit`,
            })
      );
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (!status) {
    return <div className='text-t-secondary text-13px'>{t('hivemind.settings.rateLimitLoading', { defaultValue: 'Loading rate limit status...' })}</div>;
  }

  const providers = Object.entries(status);

  if (providers.length === 0) {
    return <div className='text-t-secondary text-13px'>{t('hivemind.settings.rateLimitUnavailable', { defaultValue: 'Rate limiter is unavailable.' })}</div>;
  }

  return (
    <div className='space-y-8px'>
      <div className='flex justify-end mb-8px'>
        <Button size='small' icon={<IconRefresh />} onClick={() => void refresh()} loading={loading}>
          {t('hivemind.settings.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>
      {providers.map(([provider, info]) => (
        <div key={provider} className='flex items-center justify-between text-13px p-8px border border-border rounded'>
          <Space>
            <span className='font-500'>{provider}</span>
            <Tag size='small' color={info.remaining > 0 ? 'green' : 'red'}>
              {info.remaining}/{info.limit}
            </Tag>
            {info.reset_at && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                {new Date(info.reset_at).toLocaleTimeString()}
              </Typography.Text>
            )}
          </Space>
          <Button
            size='small'
            type='text'
            onClick={() => {
              void handleReset(provider);
            }}
            disabled={info.remaining === info.limit}
          >
            {t('hivemind.settings.rateLimitReset', { defaultValue: 'Reset' })}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default RateLimitControl;
