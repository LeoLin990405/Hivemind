/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import logoSvg from '@/renderer/assets/logos/logo.svg';
import { MenuFold } from '@icon-park/react';
import classNames from 'classnames';
import React from 'react';
import SidebarNav from './SidebarNav';

interface AppSidebarProps {
  collapsed: boolean;
  onLogoClick: () => void;
  onSessionClick?: () => void;
  isMobile: boolean;
  onClose: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onLogoClick, onSessionClick, isMobile, onClose }) => {
  return (
    <div className='size-full flex flex-col'>
      <header
        className={classNames('layout-sider-header hive-sider-header flex items-center justify-start gap-12px shrink-0', {
          'cursor-pointer': collapsed,
        })}
      >
        <div
          className={classNames('hive-logo-badge shrink-0 relative flex items-center justify-center', {
            'hive-logo-badge--collapsed': collapsed,
          })}
          onClick={onLogoClick}
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
          <button type='button' className='app-titlebar__button' onClick={onClose} aria-label='Close sidebar'>
            <MenuFold theme='outline' size='18' fill='currentColor' />
          </button>
        )}
      </header>

      <div className={classNames('layout-sider-content hive-sider-content p-8px flex-1 overflow-auto', !isMobile && 'h-[calc(100%-72px-16px)]')}>
        <SidebarNav collapsed={collapsed} onSessionClick={onSessionClick} />
      </div>
    </div>
  );
};

export default AppSidebar;
