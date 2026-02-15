/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useThemeContext } from '@/renderer/context/ThemeContext';
import HiveSelect from '@/renderer/components/base/HiveSelect';
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 主题切换器组件 / Theme switcher component
 *
 * 提供明暗模式切换功能
 * Provides light/dark mode switching functionality
 */
export const ThemeSwitcher = () => {
  const { theme, setTheme } = useThemeContext();
  const { t } = useTranslation();

  return (
    <div className='flex items-center gap-8px'>
      {/* 明暗模式选择器 / Light/Dark mode selector */}
      <HiveSelect value={theme} onChange={setTheme} className='w-160px'>
        <HiveSelect.Option value='light'>{t('settings.lightMode')}</HiveSelect.Option>
        <HiveSelect.Option value='dark'>{t('settings.darkMode')}</HiveSelect.Option>
      </HiveSelect>
    </div>
  );
};
