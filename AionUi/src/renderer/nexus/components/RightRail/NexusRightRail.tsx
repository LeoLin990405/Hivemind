/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusRightRail - Modern System Status Inspector
 *
 * Features:
 * - White floating card design
 * - Provider health monitoring with status indicators
 * - Real-time latency display for each model
 * - Resource usage metrics
 * - Quick access links to key pages
 * - Visible on large screens, collapsible
 */

import { Activity, ArrowUpRight, ChartNoAxesCombined, Cpu, WalletCards } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

/** Provider health status type */
type ProviderState = 'ok' | 'warn' | 'err';

/** Provider metric interface */
interface ProviderMetric {
  /** Provider display name */
  name: string;
  /** Latency string (e.g., "1.2s", "offline") */
  latency: string;
  /** Health status */
  state: ProviderState;
}

/** Mock provider metrics - would be replaced with real data */
const providerMetrics: ProviderMetric[] = [
  { name: 'Claude', latency: '1.2s', state: 'ok' },
  { name: 'Codex', latency: '1.7s', state: 'ok' },
  { name: 'Gemini', latency: '2.1s', state: 'warn' },
  { name: 'Qwen', latency: '1.4s', state: 'ok' },
  { name: 'DeepSeek', latency: '2.8s', state: 'warn' },
  { name: 'Ollama', latency: 'offline', state: 'err' },
];

/** CSS class mapping for status states */
const stateClassMap: Record<ProviderState, string> = {
  ok: 'nexus-chip nexus-chip--ok',
  warn: 'nexus-chip nexus-chip--warn',
  err: 'nexus-chip nexus-chip--err',
};

/** Display text mapping for status states */
const stateTextMap: Record<ProviderState, string> = {
  ok: 'healthy',
  warn: 'degraded',
  err: 'down',
};

/** Quick access link configuration */
interface QuickLink {
  label: string;
  icon: React.ElementType;
  path: string;
}

const quickLinks: QuickLink[] = [
  { label: 'Runtime Monitor', icon: Activity, path: '/monitor' },
  { label: 'Cost & Tokens', icon: ChartNoAxesCombined, path: '/monitor/stats' },
  { label: 'Model Routing', icon: Cpu, path: '/settings/model' },
  { label: 'Skills Manager', icon: WalletCards, path: '/skills' },
];

/**
 * Right rail inspector component showing system status and quick links
 */
const NexusRightRail: React.FC = () => {
  const navigate = useNavigate();

  /**
   * Navigate to a path safely
   */
  const handleNavigate = (path: string) => {
    void Promise.resolve(navigate(path)).catch((error) => {
      console.error('Navigation failed:', error);
    });
  };

  return (
    <aside className="nexus-right-rail">
      {/* Header */}
      <div className="nexus-rail-head">
        <div>
          <div className="nexus-rail-title">System Status</div>
          <div className="nexus-rail-subtitle">Live provider telemetry</div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="nexus-rail-scroll nexus-scrollbar">
        {/* Provider Health Card */}
        <section className="nexus-rail-card">
          <div className="nexus-rail-card__title">Provider Health</div>

          {providerMetrics.map((provider) => (
            <div key={provider.name} className="nexus-provider-row">
              <div className="nexus-provider-left">
                <span
                  className={`nexus-status-dot nexus-status-dot--${
                    provider.state === 'ok' ? 'ok' : provider.state === 'warn' ? 'warn' : 'err'
                  }`}
                />
                <span>{provider.name}</span>
              </div>
              <div className="flex items-center gap-8px">
                <span className="nexus-provider-latency">{provider.latency}</span>
                <span className={stateClassMap[provider.state]}>{stateTextMap[provider.state]}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Quick Access Card */}
        <section className="nexus-rail-card">
          <div className="nexus-rail-card__title">Quick Access</div>

          <div className="flex flex-col gap-8px">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                className="nexus-quick-btn"
                onClick={() => handleNavigate(link.path)}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-8px">
                    <link.icon size={13} />
                    {link.label}
                  </span>
                  <ArrowUpRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default NexusRightRail;
