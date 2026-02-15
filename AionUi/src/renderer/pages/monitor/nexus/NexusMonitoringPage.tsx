/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusMonitoringPage - SaaS Workbench styled monitoring dashboard
 * Bento Grid layout with KPI cards, CSS charts, and log streams
 */

import React, { useState, useMemo } from 'react';
import { Activity, Server, Database, Globe, Cpu, AlertCircle, CheckCircle2, Zap, Bot, RefreshCw, Loader2, TrendingUp, TrendingDown, Clock, Users, MessageSquare, MemoryStick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGatewayStats } from '@/renderer/hooks/useGatewayStats';
import './NexusMonitoringPage.css';

// Types for the monitoring data
interface ServiceHealth {
  name: string;
  status: 'Operational' | 'Degraded' | 'Down';
  uptime: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface LogEntry {
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  msg: string;
}

// Generate mock latency data for chart
const generateLatencyData = () => {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 60) + 20);
};

// Generate mock request data
const generateRequestData = () => {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 20);
};

const NexusMonitoringPage: React.FC = () => {
  const { t } = useTranslation();
  const { stats, loading, refresh } = useGatewayStats();
  const [latencyData] = useState(generateLatencyData);
  const [requestData] = useState(generateRequestData);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  // Mock services data
  const services: ServiceHealth[] = useMemo(
    () => [
      { name: 'API Gateway', status: 'Operational', uptime: '99.9%', icon: Globe },
      { name: 'Vector DB', status: 'Operational', uptime: '99.8%', icon: Database },
      { name: 'Auth Service', status: 'Degraded', uptime: '98.5%', icon: CheckCircle2 },
      { name: 'Agent Runtime', status: 'Operational', uptime: '99.9%', icon: Bot },
      { name: 'Memory Store', status: 'Operational', uptime: '99.7%', icon: MemoryStick },
    ],
    []
  );

  // Mock logs data
  const logs: LogEntry[] = useMemo(
    () => [
      { time: '10:45:22', level: 'INFO', msg: 'Orchestrator routed request to Claude 3.5 Sonnet' },
      { time: '10:45:21', level: 'INFO', msg: 'Context retrieved from vector store (12 chunks, 0.4s)' },
      { time: '10:44:58', level: 'WARN', msg: 'High latency detected on us-east-1 endpoint' },
      { time: '10:44:12', level: 'INFO', msg: 'User session started: user_882' },
      { time: '10:43:45', level: 'ERROR', msg: 'Failed to connect to backup node - retrying...' },
      { time: '10:42:30', level: 'INFO', msg: 'Model switched to gemini-1.5-pro for task_445' },
    ],
    []
  );

  // KPI Stats for Bento Grid
  const kpiStats = useMemo(
    () => [
      {
        id: 'requests',
        label: t('monitor.dashboard.totalRequests', { defaultValue: 'Total Requests' }),
        value: stats?.total_requests ? `${(stats.total_requests / 1000000).toFixed(1)}M` : '2.4M',
        change: '+12%',
        trend: 'up' as const,
        icon: Globe,
        color: 'var(--nexus-accent)',
        span: 2,
      },
      {
        id: 'latency',
        label: t('monitor.dashboard.avgLatency', { defaultValue: 'Avg Latency' }),
        value: stats?.providers?.[0]?.avg_latency_ms ? `${Math.round(stats.providers[0].avg_latency_ms)}ms` : '142ms',
        change: '-4%',
        trend: 'up' as const,
        icon: Zap,
        color: 'var(--nexus-warning)',
        span: 1,
      },
      {
        id: 'errors',
        label: t('monitor.dashboard.errorRate', { defaultValue: 'Error Rate' }),
        value: stats?.overall_success_rate ? `${((1 - stats.overall_success_rate) * 100).toFixed(2)}%` : '0.02%',
        change: '+0.01%',
        trend: 'down' as const,
        icon: AlertCircle,
        color: 'var(--nexus-success)',
        span: 1,
      },
      {
        id: 'agents',
        label: t('monitor.dashboard.activeAgents', { defaultValue: 'Active Agents' }),
        value: '14',
        change: '0',
        trend: 'up' as const,
        icon: Bot,
        color: '#a855f7',
        span: 1,
      },
      {
        id: 'users',
        label: 'Active Users',
        value: '847',
        change: '+5%',
        trend: 'up' as const,
        icon: Users,
        color: 'var(--nexus-success)',
        span: 1,
      },
      {
        id: 'messages',
        label: 'Messages/min',
        value: '1.2K',
        change: '+8%',
        trend: 'up' as const,
        icon: MessageSquare,
        color: 'var(--nexus-accent)',
        span: 1,
      },
    ],
    [stats, t]
  );

  const getStatusClass = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'Operational':
        return 'nexus-status--ok';
      case 'Degraded':
        return 'nexus-status--warn';
      case 'Down':
        return 'nexus-status--err';
    }
  };

  const getLogClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'INFO':
        return 'nexus-log--info';
      case 'WARN':
        return 'nexus-log--warn';
      case 'ERROR':
        return 'nexus-log--error';
    }
  };

  return (
    <div className='nexus-monitor-shell'>
      {/* Header */}
      <div className='nexus-monitor-header'>
        <div className='nexus-monitor-header__left'>
          <h1 className='nexus-monitor-title'>{t('monitor.title', { defaultValue: 'System Observability' })}</h1>
          <p className='nexus-monitor-subtitle'>Real-time metrics across 4 active clusters</p>
        </div>
        <div className='nexus-monitor-header__right'>
          {/* Time Range Selector */}
          <div className='nexus-monitor-time-selector'>
            {(['1h', '24h', '7d'] as const).map((range) => (
              <button key={range} className={`nexus-monitor-time-btn ${timeRange === range ? 'nexus-monitor-time-btn--active' : ''}`} onClick={() => setTimeRange(range)}>
                {range}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button className='nexus-monitor-refresh-btn' onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 size={16} className='animate-spin' /> : <RefreshCw size={16} />}
            <span>{t('monitor.dashboard.refresh', { defaultValue: 'Refresh' })}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className='nexus-monitor-grid'>
        {/* Row 1: KPI Cards */}
        {kpiStats.map((stat) => (
          <div key={stat.id} className={`nexus-kpi-card ${stat.span === 2 ? 'nexus-kpi-card--wide' : ''}`}>
            <div className='nexus-kpi-card__header'>
              <div className='nexus-kpi-card__icon' style={{ background: `color-mix(in srgb, ${stat.color} 12%, transparent 88%)`, color: stat.color }}>
                <stat.icon size={20} />
              </div>
              <span className={`nexus-kpi-trend nexus-kpi-trend--${stat.trend}`}>
                {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {stat.change}
              </span>
            </div>
            <div className='nexus-kpi-card__value'>{stat.value}</div>
            <div className='nexus-kpi-card__label'>{stat.label}</div>
          </div>
        ))}

        {/* Row 2: Latency Chart (Wide) */}
        <div className='nexus-monitor-card nexus-monitor-card--chart'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Activity size={18} />
              <span>Response Latency (ms)</span>
            </div>
            <div className='nexus-monitor-card__legend'>
              <span className='nexus-legend-item'>
                <span className='nexus-legend-dot nexus-legend-dot--primary' />
                P99
              </span>
              <span className='nexus-legend-item'>
                <span className='nexus-legend-dot' />
                Median
              </span>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <div className='nexus-bar-chart'>
            <div className='nexus-bar-chart__grid'>
              {[0, 25, 50, 75, 100].map((h) => (
                <div key={h} className='nexus-bar-chart__grid-line' style={{ bottom: `${h}%` }} />
              ))}
            </div>
            <div className='nexus-bar-chart__bars'>
              {latencyData.map((h, i) => (
                <div key={i} className='nexus-bar' style={{ height: `${h}%` }} title={`${h * 4}ms`}>
                  <div className='nexus-bar__fill' style={{ height: `${h * 0.4}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className='nexus-bar-chart__labels'>
            <span>10:00</span>
            <span>10:15</span>
            <span>10:30</span>
            <span>10:45</span>
            <span>11:00</span>
          </div>
        </div>

        {/* Row 2: Service Health */}
        <div className='nexus-monitor-card nexus-monitor-card--services'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Server size={18} />
              <span>Service Health</span>
            </div>
          </div>
          <div className='nexus-service-list'>
            {services.map((service) => (
              <div key={service.name} className='nexus-service-item'>
                <div className='nexus-service-item__left'>
                  <div className='nexus-service-item__icon'>
                    <service.icon size={16} />
                  </div>
                  <div className='nexus-service-item__info'>
                    <span className='nexus-service-item__name'>{service.name}</span>
                    <span className={`nexus-service-item__status ${getStatusClass(service.status)}`}>
                      <span className='nexus-status-dot' />
                      {service.status}
                    </span>
                  </div>
                </div>
                <span className='nexus-service-item__uptime'>{service.uptime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Request Distribution */}
        <div className='nexus-monitor-card'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Globe size={18} />
              <span>Weekly Requests</span>
            </div>
          </div>
          <div className='nexus-bar-chart nexus-bar-chart--horizontal'>
            {requestData.map((h, i) => (
              <div key={i} className='nexus-bar-row'>
                <span className='nexus-bar-row__label'>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                <div className='nexus-bar-row__track'>
                  <div className='nexus-bar-row__fill' style={{ width: `${h}%` }} />
                </div>
                <span className='nexus-bar-row__value'>{h}K</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: System Clock */}
        <div className='nexus-monitor-card nexus-monitor-card--time'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Clock size={18} />
              <span>System Time</span>
            </div>
          </div>
          <div className='nexus-time-display'>
            <span className='nexus-time-display__value'>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className='nexus-time-display__date'>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Row 3: CPU Usage */}
        <div className='nexus-monitor-card'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Cpu size={18} />
              <span>CPU Usage</span>
            </div>
          </div>
          <div className='nexus-gauge'>
            <div className='nexus-gauge__ring'>
              <svg viewBox='0 0 100 100'>
                <circle className='nexus-gauge__bg' cx='50' cy='50' r='40' fill='none' strokeWidth='8' />
                <circle className='nexus-gauge__fill' cx='50' cy='50' r='40' fill='none' strokeWidth='8' strokeDasharray={`${68 * 2.51} 251`} strokeLinecap='round' />
              </svg>
              <div className='nexus-gauge__value'>68%</div>
            </div>
          </div>
        </div>

        {/* Row 4: Logs (Full Width) */}
        <div className='nexus-monitor-card nexus-monitor-card--logs'>
          <div className='nexus-monitor-card__header'>
            <div className='nexus-monitor-card__title'>
              <Activity size={18} />
              <span>System Logs</span>
            </div>
            <button className='nexus-monitor-card__action'>View All</button>
          </div>
          <div className='nexus-log-stream'>
            {logs.map((log, i) => (
              <div key={i} className={`nexus-log-entry ${getLogClass(log.level)}`}>
                <span className='nexus-log-entry__time'>{log.time}</span>
                <span className='nexus-log-entry__level'>{log.level}</span>
                <span className='nexus-log-entry__msg'>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NexusMonitoringPage;
