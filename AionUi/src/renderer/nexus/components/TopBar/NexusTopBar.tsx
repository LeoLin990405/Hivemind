/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusTopBar - Modern Frosted Glass Top Bar
 *
 * Features:
 * - Frosted glass effect (backdrop-blur-md + semi-transparent white)
 * - Global search/command input
 * - Dynamic page title and breadcrumb
 * - Sidebar and inspector toggle buttons
 * - System status indicator on the right
 */

import { MenuFold, MenuUnfold } from '@icon-park/react';
import { Bell, HelpCircle, PanelRightClose, PanelRightOpen, SearchCode } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NexusCommandInput from '../CommandInput/NexusCommandInput';

interface NexusTopBarProps {
  /** Whether the sidebar is collapsed */
  collapsed: boolean;
  /** Callback to toggle sidebar */
  onToggleSidebar: () => void;
  /** Callback to toggle inspector/rail */
  onToggleInspector: () => void;
  /** Whether the inspector is open */
  inspectorOpen: boolean;
}

/**
 * Route to title mapping for dynamic page titles
 */
const routeTitleMap: Record<string, string> = {
  '/guid': 'Command Center',
  '/knowledge': 'Knowledge Hub',
  '/monitor': 'Observability',
  '/memory': 'Memory Hub',
  '/agent-teams': 'Agent Teams',
  '/skills': 'Skills Manager',
  '/settings': 'System Settings',
};

/**
 * Top navigation bar component for Nexus layout
 */
const NexusTopBar: React.FC<NexusTopBarProps> = ({
  collapsed,
  onToggleSidebar,
  onToggleInspector,
  inspectorOpen,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Safe navigation with error handling
   */
  const safeNavigate = (target: string) => {
    void Promise.resolve(navigate(target)).catch((error) => {
      console.error('Navigation failed:', error);
    });
  };

  /**
   * Get page title based on current route
   */
  const getPageTitle = () => {
    const matchedPrefix = Object.keys(routeTitleMap).find((prefix) =>
      location.pathname.startsWith(prefix)
    );
    return matchedPrefix ? routeTitleMap[matchedPrefix] : 'HiveMind Nexus';
  };

  /**
   * Handle command input submission
   */
  const handleCommandSubmit = (command: string) => {
    // Navigation commands
    if (command.startsWith('/goto ')) {
      safeNavigate(command.replace('/goto ', '').trim() || '/guid');
      return;
    }
    if (command.startsWith('/monitor')) {
      safeNavigate('/monitor');
      return;
    }
    // Default: go to home
    safeNavigate('/guid');
  };

  return (
    <header className="nexus-topbar flex items-center gap-10px px-12px shrink-0">
      {/* Left: Sidebar Toggle */}
      <button
        type="button"
        className="app-titlebar__button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <MenuUnfold theme="outline" size="18" fill="currentColor" />
        ) : (
          <MenuFold theme="outline" size="18" fill="currentColor" />
        )}
      </button>

      {/* Title Section */}
      <div className="min-w-180px">
        <div className="nexus-topbar__title">{getPageTitle()}</div>
        <div className="nexus-topbar__meta">Nexus - Parallel Orchestration</div>
      </div>

      {/* Center: Command Input */}
      <div className="flex-1 max-w-700px">
        <NexusCommandInput onSubmit={handleCommandSubmit} />
      </div>

      {/* System Status Indicator */}
      <div className="hidden lg:flex items-center gap-8px px-12px py-6px rounded-[999px] border border-[var(--nexus-border-subtle)] bg-[var(--nexus-bg-app)] shadow-sm">
        <span className="nexus-status-dot nexus-status-dot--ok" />
        <span className="text-11px text-[var(--nexus-text-secondary)] font-medium">Gateway Healthy</span>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-4px">
        {/* Monitor Link */}
        <button
          type="button"
          className="app-titlebar__button"
          onClick={() => safeNavigate('/monitor')}
          aria-label="Open monitor"
          title="Open monitor"
        >
          <SearchCode size={16} />
        </button>

        {/* Inspector Toggle */}
        <button
          type="button"
          className={inspectorOpen ? 'app-titlebar__button app-titlebar__button--active' : 'app-titlebar__button'}
          onClick={onToggleInspector}
          aria-label={inspectorOpen ? 'Close inspector' : 'Open inspector'}
          title={inspectorOpen ? 'Close inspector' : 'Open inspector'}
        >
          {inspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>

        {/* Notifications/Settings Link */}
        <button
          type="button"
          className="app-titlebar__button"
          onClick={() => safeNavigate('/settings/hivemind')}
          aria-label="Open settings"
          title="Open settings"
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
};

export default NexusTopBar;
