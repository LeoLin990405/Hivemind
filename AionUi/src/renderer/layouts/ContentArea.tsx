/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import classNames from 'classnames';
import React from 'react';

interface ContentAreaProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  padded?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-640px',
  md: 'max-w-960px',
  lg: 'max-w-1200px',
  xl: 'max-w-1440px',
  full: '',
} as const;

const ContentArea: React.FC<ContentAreaProps> = ({ children, maxWidth = 'lg', className, padded = true }) => {
  return (
    <div className={classNames('flex-1 overflow-auto', padded && 'px-24px py-20px', className)}>
      <div className={classNames('mx-auto w-full', maxWidthMap[maxWidth])}>{children}</div>
    </div>
  );
};

export default ContentArea;
