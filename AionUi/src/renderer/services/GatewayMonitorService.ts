/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProviderPerformance = {
  provider: string;
  requests: number;
  success_rate: number;
  avg_latency_ms: number;
  errors: number;
  enabled?: boolean;
};

export type PerformanceSummary = {
  total_requests: number;
  overall_success_rate: number;
  providers: ProviderPerformance[];
  hours?: number;
  timestamp: string;
};

export type CacheStats = {
  enabled?: boolean;
  total_entries: number;
  hit_rate: number;
  total_hits: number;
  total_misses: number;
};

export type Task = {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
  created_at: string;
  completed_at?: string | null;
  error?: string | null;
};

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset_at: string | null;
  is_limited?: boolean;
  current_rpm?: number;
  total_limited?: number;
};

export type RateLimitStatus = Record<string, RateLimitInfo>;

export class GatewayMonitorService {
  private baseUrl: string;

  constructor(gatewayUrl = 'http://localhost:8765') {
    this.baseUrl = gatewayUrl.replace(/\/+$/, '');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${path}`);
    }

    return (await response.json()) as T;
  }

  async getStats(hours = 24): Promise<PerformanceSummary> {
    return this.request<PerformanceSummary>(`/api/monitor/stats?hours=${hours}`);
  }

  async getCacheStats(): Promise<CacheStats> {
    return this.request<CacheStats>('/api/monitor/cache/stats');
  }

  async clearCache(): Promise<{ status: string; message?: string; cleared?: number }> {
    return this.request<{ status: string; message?: string; cleared?: number }>('/api/monitor/cache/clear', {
      method: 'POST',
    });
  }

  async getTasks(limit = 20): Promise<Task[]> {
    const result = await this.request<{ tasks?: Task[] }>(`/api/monitor/tasks?limit=${limit}`);
    return result.tasks || [];
  }

  async getRateLimitStatus(): Promise<RateLimitStatus> {
    return this.request<RateLimitStatus>('/api/monitor/ratelimit');
  }

  async resetRateLimit(provider: string): Promise<void> {
    await this.request(`/api/monitor/ratelimit/${encodeURIComponent(provider)}/reset`, {
      method: 'POST',
    });
  }
}

export const gatewayMonitorService = new GatewayMonitorService();
