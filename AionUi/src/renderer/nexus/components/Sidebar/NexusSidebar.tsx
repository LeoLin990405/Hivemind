/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusSidebar - Modern White Floating Navigation Sidebar
 *
 * Features:
 * - White floating card with soft shadow
 * - Collapsible navigation (260px -> 72px)
 * - Selected items: accent background + brand color icon
 * - Session history with grouped view
 * - Quick access to Spaces (Knowledge, Memory, Monitor, Skills, Agents)
 * - Settings toggle at bottom
 */

import classNames from 'classnames';
import { ArrowLeftCircle, BookOpen, History, LayoutDashboard, Plus, Settings, Wrench } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import SettingsSider from '@/renderer/pages/settings/SettingsSider';
import WorkspaceGroupedHistory from '@/renderer/pages/conversation/WorkspaceGroupedHistory';
import { usePreviewContext } from '@/renderer/pages/conversation/preview';

interface NexusSidebarProps {
  /** Callback when a session is clicked (used for mobile close) */
  onSessionClick?: () => void;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
}

interface NexusNavItemProps {
  /** Display label */
  label: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Collapsed state */
  collapsed: boolean;
  /** Active state */
  active?: boolean;
  /** Primary styling */
  primary?: boolean;
}

/**
 * Navigation item component with hover and active states
 * Active: accent background + accent color icon/text
 */
const NexusNavItem: React.FC<NexusNavItemProps> = ({
  label,
  icon,
  onClick,
  collapsed,
  active = false,
  primary = false,
}) => (
  <button
    type="button"
    className={classNames(
      'nexus-nav-item',
      {
        'nexus-nav-item--active': active,
        'nexus-nav-item--primary': primary,
        'justify-center': collapsed,
      }
    )}
    onClick={onClick}
    aria-label={collapsed ? label : undefined}
  >
    <span className={classNames('shrink-0 nav-icon', { 'text-[var(--nexus-accent)]': active && !primary })}>{icon}</span>
    {!collapsed && <span className="truncate font-medium">{label}</span>}
  </button>
);

/**
 * Main sidebar component for Nexus layout
 */
const NexusSidebar: React.FC<NexusSidebarProps> = ({ onSessionClick, collapsed = false }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { closePreview } = usePreviewContext();
  const { pathname, search, hash } = location;

  // Route matching
  const isSettings = pathname.startsWith('/settings');
  const isMonitor = pathname.startsWith('/monitor');
  const isKnowledge = pathname.startsWith('/knowledge');
  const isMemory = pathname.startsWith('/memory');
  const isAgentTeams = pathname.startsWith('/agent-teams');
  const isSkills = pathname.startsWith('/skills');

  // Track last non-settings path for back navigation
  const lastNonSettingsPathRef = useRef('/guid');

  useEffect(() => {
    if (!pathname.startsWith('/settings')) {
      lastNonSettingsPathRef.current = `${pathname}${search}${hash}`;
    }
  }, [pathname, search, hash]);

  /**
   * Safe navigation with error handling
   */
  const safeNavigate = (target: string) => {
    Promise.resolve(navigate(target)).catch((error) => {
      console.error('Navigation failed:', error);
    });
    onSessionClick?.();
  };

  /**
   * Handle new conversation action
   */
  const handleNewConversation = () => {
    closePreview();
    safeNavigate('/guid');
  };

  /**
   * Handle settings toggle
   */
  const handleSettingsToggle = () => {
    if (isSettings) {
      safeNavigate(lastNonSettingsPathRef.current || '/guid');
      return;
    }
    safeNavigate('/settings/hivemind');
  };

  return (
    <div className="size-full flex flex-col">
      {/* Orchestrator Label */}
      {!collapsed && (
        <div className="px-10px pt-10px pb-6px">
          <div className="nexus-sider-kicker">Orchestrator</div>
        </div>
      )}

      {/* Primary Action */}
      <div className="px-8px pb-8px">
        <NexusNavItem
          label={t('conversation.welcome.newConversation')}
          icon={<Plus size={16} />}
          collapsed={collapsed}
          primary
          onClick={handleNewConversation}
        />
      </div>

      {/* Navigation Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8px nexus-scrollbar">
        {isSettings ? (
          /* Settings Navigation */
          <SettingsSider collapsed={collapsed} />
        ) : (
          /* Main Navigation */
          <>
            {/* Sessions Section */}
            {!collapsed && <div className="nexus-nav-group-title">Sessions</div>}
            <WorkspaceGroupedHistory collapsed={collapsed} onSessionClick={onSessionClick} />

            {/* Spaces Section */}
            <div className="mt-10px border-t border-[var(--nexus-border-subtle)] pt-8px flex flex-col gap-4px">
              {!collapsed && <div className="nexus-nav-group-title mt-0">Spaces</div>}

              <NexusNavItem
                label={t('knowledge.title', { defaultValue: 'Knowledge Hub' })}
                icon={<BookOpen size={15} />}
                collapsed={collapsed}
                active={isKnowledge}
                onClick={() => safeNavigate(isKnowledge ? '/guid' : '/knowledge')}
              />

              <NexusNavItem
                label={t('memory.title')}
                icon={<History size={15} />}
                collapsed={collapsed}
                active={isMemory}
                onClick={() => safeNavigate(isMemory ? '/guid' : '/memory')}
              />

              <NexusNavItem
                label={t('monitor.title', { defaultValue: 'Monitor' })}
                icon={<LayoutDashboard size={15} />}
                collapsed={collapsed}
                active={isMonitor}
                onClick={() => safeNavigate(isMonitor ? '/guid' : '/monitor')}
              />

              <NexusNavItem
                label={t('skills.title', { defaultValue: 'Skills' })}
                icon={<Wrench size={15} />}
                collapsed={collapsed}
                active={isSkills}
                onClick={() => safeNavigate(isSkills ? '/guid' : '/skills')}
              />

              <NexusNavItem
                label={t('agentTeams.title', { defaultValue: 'Agent Teams' })}
                icon={<LayoutDashboard size={15} />}
                collapsed={collapsed}
                active={isAgentTeams}
                onClick={() => safeNavigate(isAgentTeams ? '/guid' : '/agent-teams/dashboard')}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer - Settings Toggle */}
      <div className="p-8px border-t border-[var(--nexus-border-subtle)]">
        <NexusNavItem
          label={isSettings ? t('common.back') : t('common.settings')}
          icon={isSettings ? <ArrowLeftCircle size={15} /> : <Settings size={15} />}
          collapsed={collapsed}
          active={isSettings}
          onClick={handleSettingsToggle}
        />
      </div>
    </div>
  );
};

export default NexusSidebar;
