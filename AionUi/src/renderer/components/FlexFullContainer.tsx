/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PropsWithChildren } from 'react';
import React from 'react';

import classNames from 'classnames';

/**
 * Simple flex container that fills available space.
 * Note: Prefer direct Tailwind classes (flex flex-col flex-1 min-h-0) for new code.
 */
const FlexFullContainer: React.FC<
  PropsWithChildren<{
    className?: string;
    containerClassName?: string;
  }>
> = (props) => {
  return (
    <div className={classNames('flex flex-col flex-1 min-h-0', props.className)}>
      <div className={classNames('flex-1 min-h-0', props.containerClassName)}>{props.children}</div>
    </div>
  );
};

export default FlexFullContainer;
