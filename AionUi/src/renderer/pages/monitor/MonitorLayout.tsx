/**
 * @license
 * Copyright 2026 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu } from '@arco-design/web-react';
import { IconDashboard, IconList, IconStorage } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';

const { Sider, Content } = Layout;

const MonitorLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/monitor',
      label: t('monitor.nav.dashboard', { defaultValue: 'Dashboard' }),
      icon: <IconDashboard />,
    },
    {
      key: '/monitor/cache',
      label: t('monitor.nav.cache', { defaultValue: 'Cache' }),
      icon: <IconStorage />,
    },
    {
      key: '/monitor/tasks',
      label: t('monitor.nav.tasks', { defaultValue: 'Tasks' }),
      icon: <IconList />,
    },
  ];

  const selectedKey = menuItems.some((item) => item.key === location.pathname) ? location.pathname : '/monitor';

  return (
    <Layout className='h-full'>
      <Sider width={220} className='border-r border-border !bg-1'>
        <div className='p-16px'>
          <h2 className='text-16px font-600 mb-12px'>{t('monitor.title', { defaultValue: 'Gateway Monitor' })}</h2>
          <Menu selectedKeys={[selectedKey]} onClickMenuItem={(key) => navigate(key)} style={{ width: '100%' }}>
            {menuItems.map((item) => (
              <Menu.Item key={item.key}>
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </div>
      </Sider>
      <Content className='p-20px overflow-auto'>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MonitorLayout;
