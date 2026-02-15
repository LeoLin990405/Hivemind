/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';
import PwaPullToRefresh from '@/renderer/components/PwaPullToRefresh';
import Titlebar from '@/renderer/components/Titlebar';
import { MenuFold, MenuUnfold } from '@icon-park/react';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutContext } from './context/LayoutContext';
import { useDirectorySelection } from './hooks/useDirectorySelection';
import { useMultiAgentDetection } from './hooks/useMultiAgentDetection';
import { processCustomCss } from './utils/customCssProcessor';
import UpdateModal from '@/renderer/components/UpdateModal';
import logoSvg from '@/renderer/assets/logos/logo.svg';

const useDebug = () => {
  const [count, setCount] = useState(0);
  const timer = useRef<any>(null);
  const onClick = () => {
    const open = () => {
      ipcBridge.application.openDevTools.invoke().catch((error) => {
        console.error('Failed to open dev tools:', error);
      });
      setCount(0);
    };
    if (count >= 3) {
      return open();
    }
    setCount((prev) => {
      if (prev >= 2) {
        open();
        return 0;
      }
      return prev + 1;
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      clearTimeout(timer.current);
      setCount(0);
    }, 1000);
  };

  return { onClick };
};

const DEFAULT_SIDER_WIDTH = 250;

const Layout: React.FC<{
  sider: React.ReactNode;
  onSessionClick?: () => void;
}> = ({ sider, onSessionClick: _onSessionClick }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customCss, setCustomCss] = useState<string>('');
  const { onClick } = useDebug();
  const { contextHolder: multiAgentContextHolder } = useMultiAgentDetection();
  const { contextHolder: directorySelectionContextHolder } = useDirectorySelection();
  const location = useLocation();
  const workspaceAvailable = location.pathname.startsWith('/conversation/');
  const collapsedRef = useRef(collapsed);

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
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.includes('customCss')) {
        loadCustomCss();
      }
    };

    window.addEventListener('custom-css-updated', handleCssUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('custom-css-updated', handleCssUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const styleId = 'user-defined-custom-css';

    if (!customCss) {
      document.getElementById(styleId)?.remove();
      return;
    }

    const wrappedCss = processCustomCss(customCss);

    const ensureStyleAtEnd = () => {
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

      if (styleEl && styleEl.textContent === wrappedCss && styleEl === document.head.lastElementChild) {
        return;
      }

      styleEl?.remove();
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.type = 'text/css';
      styleEl.textContent = wrappedCss;
      document.head.appendChild(styleEl);
    };

    ensureStyleAtEnd();

    const observer = new MutationObserver((mutations) => {
      const hasNewStyle = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node.nodeName === 'STYLE' || node.nodeName === 'LINK'));

      if (hasNewStyle) {
        const element = document.getElementById(styleId);
        if (element && element !== document.head.lastElementChild) {
          ensureStyleAtEnd();
        }
      }
    });

    observer.observe(document.head, { childList: true });

    return () => {
      observer.disconnect();
      document.getElementById(styleId)?.remove();
    };
  }, [customCss]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || collapsedRef.current) {
      return;
    }
    setCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  const siderWidth = isMobile ? (collapsed ? 0 : DEFAULT_SIDER_WIDTH) : collapsed ? 64 : DEFAULT_SIDER_WIDTH;

  return (
    <LayoutContext.Provider value={{ isMobile, siderCollapsed: collapsed, setSiderCollapsed: setCollapsed }}>
      <div className='app-shell hive-shell flex flex-col size-full min-h-0'>
        <Titlebar workspaceAvailable={workspaceAvailable} />
        {isMobile && !collapsed && <div className='fixed inset-0 bg-[rgba(6,10,22,0.52)] z-90 backdrop-blur-[1px]' onClick={() => setCollapsed(true)} aria-hidden='true' />}

        <div className='hive-workspace flex size-full flex-1 min-h-0'>
          <aside
            className={classNames('layout-sider hive-sider flex flex-col shrink-0 transition-all duration-200', {
              collapsed: collapsed,
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
            <header
              className={classNames('layout-sider-header hive-sider-header flex items-center justify-start gap-12px shrink-0', {
                'cursor-pointer group ': collapsed,
              })}
            >
              <div
                className={classNames('hive-logo-badge shrink-0 relative flex items-center justify-center', {
                  'hive-logo-badge--collapsed': collapsed,
                })}
                onClick={onClick}
              >
                <img
                  src={logoSvg}
                  alt='HiveMind Logo'
                  className={classNames('hive-logo-mark', {
                    'scale-130': !collapsed,
                  })}
                />
              </div>
              <div className='hive-brand-title flex-1 collapsed-hidden'>HiveMind</div>
              {isMobile && !collapsed && (
                <button type='button' className='app-titlebar__button' onClick={() => setCollapsed(true)} aria-label='Collapse sidebar'>
                  {collapsed ? <MenuUnfold theme='outline' size='18' fill='currentColor' /> : <MenuFold theme='outline' size='18' fill='currentColor' />}
                </button>
              )}
            </header>
            <div className={classNames('layout-sider-content hive-sider-content p-8px flex-1 overflow-auto', !isMobile && 'h-[calc(100%-72px-16px)]')}>
              {React.isValidElement(sider)
                ? React.cloneElement(sider, {
                    onSessionClick: () => {
                      if (isMobile) setCollapsed(true);
                    },
                    collapsed,
                  } as any)
                : sider}
            </div>
          </aside>

          <main
            className='layout-content hive-content bg-1 flex flex-col flex-1 min-h-0 overflow-auto'
            onClick={() => {
              if (isMobile && !collapsed) setCollapsed(true);
            }}
            style={
              isMobile
                ? {
                    width: '100vw',
                  }
                : undefined
            }
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

export default Layout;
