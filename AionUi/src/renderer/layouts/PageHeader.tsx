/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import classNames from 'classnames';
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => {
  return (
    <div className={classNames('sticky top-0 z-10 bg-1 border-b border-b-base px-24px py-16px flex items-center justify-between gap-16px', className)}>
      <div className='min-w-0'>
        <h1 className='text-lg font-semibold text-t-primary truncate'>{title}</h1>
        {description && <p className='text-sm text-t-secondary mt-2px truncate'>{description}</p>}
      </div>
      {actions && <div className='flex items-center gap-8px shrink-0'>{actions}</div>}
    </div>
  );
};

export default PageHeader;
