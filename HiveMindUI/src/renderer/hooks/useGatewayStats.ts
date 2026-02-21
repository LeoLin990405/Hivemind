/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GatewayMonitorService, gatewayMonitorService, type CacheStats, type PerformanceSummary } from '@/renderer/services/GatewayMonitorService';

type UseGatewayStatsResult = {
  stats: PerformanceSummary | null;
  cacheStats: CacheStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useGatewayStats(gatewayUrl?: string, autoRefresh = true, intervalMs = 10000): UseGatewayStatsResult {
  const [stats, setStats] = useState<PerformanceSummary | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => {
    if (gatewayUrl && gatewayUrl.trim().length > 0) {
      return new GatewayMonitorService(gatewayUrl);
    }
    return gatewayMonitorService;
  }, [gatewayUrl]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, cacheData] = await Promise.all([service.getStats(24), service.getCacheStats()]);
      setStats(statsData);
      setCacheStats(cacheData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void refresh();

    if (!autoRefresh) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefresh, intervalMs, refresh]);

  return {
    stats,
    cacheStats,
    loading,
    error,
    refresh,
  };
}
