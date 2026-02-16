/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
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
import AppSidebar from './AppSidebar';

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 56;
const MOBILE_BREAKPOINT = 768;

const useDebug = () => {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onClick = () => {
    const open = () => {
      ipcBridge.application.openDevTools.invoke().catch((error) => {
        console.error('Failed to open dev tools:', error);
      });
      setCount(0);
    };
    if (count >= 3) return open();
    setCount((prev) => {
      if (prev >= 2) {
        open();
        return 0;
      }
      return prev + 1;
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setCount(0);
    }, 1000);
  };
  return { onClick };
};

const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customCss, setCustomCss] = useState('');
  const { onClick: onLogoClick } = useDebug();
  const { contextHolder: multiAgentContextHolder } = useMultiAgentDetection();
  const { contextHolder: directorySelectionContextHolder } = useDirectorySelection();
  const location = useLocation();
  const workspaceAvailable = location.pathname.startsWith('/conversation/');
  const collapsedRef = useRef(collapsed);

  // Custom CSS loading
  useEffect(() => {
    const loadCustomCss = () => {
      ConfigStorage.get('customCss')
        .then((css) => setCustomCss(css || ''))
        .catch((error) => console.error('Failed to load custom CSS:', error));
    };
    loadCustomCss();

    const handleCssUpdate = (event: CustomEvent) => {
      if (event.detail?.customCss !== undefined) {
        setCustomCss(event.detail.customCss || '');
      }
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('customCss')) loadCustomCss();
    };

    window.addEventListener('custom-css-updated', handleCssUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('custom-css-updated', handleCssUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Inject custom CSS into <head>
  useEffect(() => {
    const styleId = 'user-defined-custom-css';
    if (!customCss) {
      document.getElementById(styleId)?.remove();
      return;
    }
    const wrappedCss = processCustomCss(customCss);

    const ensureStyleAtEnd = () => {
      let el = document.getElementById(styleId) as HTMLStyleElement | null;
      if (el && el.textContent === wrappedCss && el === document.head.lastElementChild) return;
      el?.remove();
      el = document.createElement('style');
      el.id = styleId;
      el.type = 'text/css';
      el.textContent = wrappedCss;
      document.head.appendChild(el);
    };
    ensureStyleAtEnd();

    const observer = new MutationObserver((mutations) => {
      const hasNewStyle = mutations.some((m) => Array.from(m.addedNodes).some((n) => n.nodeName === 'STYLE' || n.nodeName === 'LINK'));
      if (hasNewStyle) {
        const el = document.getElementById(styleId);
        if (el && el !== document.head.lastElementChild) ensureStyleAtEnd();
      }
    });
    observer.observe(document.head, { childList: true });
    return () => {
      observer.disconnect();
      document.getElementById(styleId)?.remove();
    };
  }, [customCss]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (!isMobile || collapsedRef.current) return;
    setCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  const siderWidth = isMobile ? (collapsed ? 0 : SIDEBAR_EXPANDED) : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <LayoutContext.Provider value={{ isMobile, siderCollapsed: collapsed, setSiderCollapsed: setCollapsed }}>
      <div className='app-shell hive-shell flex flex-col size-full min-h-0'>
        <Titlebar workspaceAvailable={workspaceAvailable} />

        {isMobile && !collapsed && <div className='fixed inset-0 bg-black/40 z-90' onClick={() => setCollapsed(true)} aria-hidden='true' />}

        <div className='hive-workspace flex size-full flex-1 min-h-0'>
          <aside
            className={classNames('layout-sider hive-sider flex flex-col shrink-0 transition-width duration-200', {
              collapsed,
            })}
            style={{
              width: siderWidth,
              ...(isMobile
                ? {
                    position: 'fixed',
                    left: 0,
                    zIndex: 100,
                    transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
                    transition: 'none',
                    pointerEvents: collapsed ? 'none' : 'auto',
                  }
                : {}),
            }}
          >
            <AppSidebar
              collapsed={collapsed}
              onLogoClick={onLogoClick}
              onSessionClick={() => {
                if (isMobile) setCollapsed(true);
              }}
              isMobile={isMobile}
              onClose={() => setCollapsed(true)}
            />
          </aside>

          <main
            className='layout-content hive-content bg-1 flex flex-col flex-1 min-h-0 overflow-auto'
            onClick={() => {
              if (isMobile && !collapsed) setCollapsed(true);
            }}
            style={isMobile ? { width: '100vw' } : undefined}
          >
            <Outlet />
            {multiAgentContextHolder}
            {directorySelectionContextHolder}
            <PwaPullToRefresh />
            <UpdateModal />
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
};

export default AppShell;
