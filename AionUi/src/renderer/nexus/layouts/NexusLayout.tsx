/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusLayout - Modern White Floating Sheets Layout
 *
 * Three-column responsive layout:
 * - Sidebar (260px, collapsible to 72px) - White floating card with dot pattern background
 * - Main Content (flexible) - Frosted glass topbar + content area
 * - Right Rail (300px, toggleable) - System status inspector
 */

import { ConfigStorage } from '@/common/storage';
import PwaPullToRefresh from '@/renderer/components/PwaPullToRefresh';
import Titlebar from '@/renderer/components/Titlebar';
import UpdateModal from '@/renderer/components/UpdateModal';
import { LayoutContext } from '@/renderer/context/LayoutContext';
import { useDirectorySelection } from '@/renderer/hooks/useDirectorySelection';
import { useMultiAgentDetection } from '@/renderer/hooks/useMultiAgentDetection';
import { processCustomCss } from '@/renderer/utils/customCssProcessor';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NexusRightRail from '../components/RightRail/NexusRightRail';
import NexusSidebar from '../components/Sidebar/NexusSidebar';
import NexusTopBar from '../components/TopBar/NexusTopBar';

/** Default sidebar width in pixels */
const DEFAULT_SIDER_WIDTH = 260;

/** Collapsed sidebar width in pixels */
const COLLAPSED_SIDER_WIDTH = 72;

/** Right rail width in pixels */
const RIGHT_RAIL_WIDTH = 300;

/** Mobile breakpoint in pixels */
const MOBILE_BREAKPOINT = 960;

interface NexusLayoutProps {
  /** Sidebar content (typically navigation) */
  sider: React.ReactNode;
}

/**
 * Main Nexus layout component providing the three-column Floating Sheets UI
 */
const NexusLayout: React.FC<NexusLayoutProps> = ({ sider }) => {
  // State
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customCss, setCustomCss] = useState<string>('');
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Hooks
  const { contextHolder: multiAgentContextHolder } = useMultiAgentDetection();
  const { contextHolder: directorySelectionContextHolder } = useDirectorySelection();
  const location = useLocation();

  // Derived state
  const workspaceAvailable = location.pathname.startsWith('/conversation/');
  const collapsedRef = useRef(collapsed);

  // Custom CSS loading and processing
  useEffect(() => {
    const loadCustomCss = () => {
      ConfigStorage.get('customCss')
        .then((css) => setCustomCss(css || ''))
        .catch((error) => {
          console.error('Failed to load custom CSS:', error);
        });
    };

    loadCustomCss();

    const handleCssUpdate = (event: CustomEvent) => {
      if (event.detail?.customCss !== undefined) {
        setCustomCss(event.detail.customCss || '');
      }
    };

    window.addEventListener('custom-css-updated', handleCssUpdate as EventListener);
    return () => {
      window.removeEventListener('custom-css-updated', handleCssUpdate as EventListener);
    };
  }, []);

  // Apply custom CSS
  useEffect(() => {
    const styleId = 'user-defined-custom-css';

    if (!customCss) {
      document.getElementById(styleId)?.remove();
      return;
    }

    const wrappedCss = processCustomCss(customCss);
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.type = 'text/css';
    styleEl.textContent = wrappedCss;

    document.getElementById(styleId)?.remove();
    document.head.appendChild(styleEl);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [customCss]);

  // Mobile detection and responsive adjustments
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setInspectorOpen(false);
      }
    };

    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (!isMobile || collapsedRef.current) {
      return;
    }
    setCollapsed(true);
  }, [isMobile]);

  // Keep ref in sync
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  // Calculate sidebar width based on state
  const siderWidth = isMobile
    ? collapsed
      ? 0
      : DEFAULT_SIDER_WIDTH
    : collapsed
      ? COLLAPSED_SIDER_WIDTH
      : DEFAULT_SIDER_WIDTH;

  // Toggle handlers
  const toggleSidebar = () => setCollapsed((prev) => !prev);
  const toggleInspector = () => setInspectorOpen((prev) => !prev);

  return (
    <LayoutContext.Provider value={{ isMobile, siderCollapsed: collapsed, setSiderCollapsed: setCollapsed }}>
      <div className="nexus-shell flex flex-col size-full min-h-0">
        <Titlebar workspaceAvailable={workspaceAvailable} />

        <div className="nexus-workspace flex size-full flex-1 min-h-0">
          {/* Sidebar - Floating white card */}
          <aside
            className={classNames('nexus-sider flex flex-col shrink-0 transition-all duration-200', {
              collapsed,
            })}
            style={{
              width: siderWidth,
              ...(isMobile
                ? {
                    position: 'fixed',
                    left: 0,
                    top: 40,
                    bottom: 0,
                    zIndex: 120,
                    transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
                    transition: 'transform 160ms ease',
                  }
                : {}),
            }}
          >
            {/* Sidebar Header */}
            <header className="nexus-sider-header flex items-center gap-10px shrink-0">
              <span className="nexus-status-dot nexus-status-dot--ok" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="nexus-brand-text">HiveMind Nexus</span>
                  <span className="nexus-sider-kicker">AI Command Console</span>
                </div>
              )}
            </header>

            {/* Sidebar Content */}
            <div className="p-8px flex-1 min-h-0 overflow-auto nexus-scrollbar">
              {React.isValidElement(sider)
                ? React.cloneElement(sider, {
                    onSessionClick: () => {
                      if (isMobile) {
                        setCollapsed(true);
                      }
                    },
                    collapsed,
                  } as React.Attributes)
                : sider}
            </div>
          </aside>

          {/* Mobile overlay */}
          {isMobile && !collapsed && (
            <div
              className="fixed inset-0 bg-[rgba(0,0,0,0.3)] z-110 backdrop-blur-sm"
              onClick={() => setCollapsed(true)}
              aria-hidden="true"
            />
          )}

          {/* Main Content Area - Floating card with frosted topbar */}
          <section className="nexus-main flex flex-col flex-1 min-h-0">
            <NexusTopBar
              collapsed={collapsed}
              onToggleSidebar={toggleSidebar}
              onToggleInspector={toggleInspector}
              inspectorOpen={inspectorOpen}
            />

            <main className="nexus-content flex-1 min-h-0 overflow-auto nexus-scrollbar">
              <Outlet />
              {multiAgentContextHolder}
              {directorySelectionContextHolder}
              <PwaPullToRefresh />
              <UpdateModal />
            </main>
          </section>

          {/* Right Rail - Desktop */}
          {!isMobile && inspectorOpen && <NexusRightRail />}

          {/* Right Rail - Mobile (overlay) */}
          {isMobile && inspectorOpen && (
            <>
              <div
                className="fixed inset-0 bg-[rgba(0,0,0,0.3)] z-125 backdrop-blur-sm"
                onClick={() => setInspectorOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed right-0 top-40px bottom-0 z-130">
                <NexusRightRail />
              </div>
            </>
          )}
        </div>
      </div>
    </LayoutContext.Provider>
  );
};

export default NexusLayout;
