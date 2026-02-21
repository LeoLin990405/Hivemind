/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Steps } from '@arco-design/web-react';
import type { StepsProps } from '@arco-design/web-react/es/Steps';
import classNames from 'classnames';
import React from 'react';

/**
 * 步骤条组件属性 / Steps component props
 */
export interface HiveStepsProps extends StepsProps {
  /** 额外的类名 / Additional class name */
  className?: string;
}

/**
 * 步骤条组件 / Steps component
 *
 * 基于 Arco Design Steps 的封装，提供统一的样式主题
 * Wrapper around Arco Design Steps with unified theme styling
 *
 * @features
 * - 自定义品牌色主题 / Custom brand color theme
 * - 完成态的特殊样式处理 / Special styling for finished state
 * - 完整的 Arco Steps API 支持 / Full Arco Steps API support
 *
 * @example
 * ```tsx
 * // 基本用法 / Basic usage
 * <HiveSteps current={1}>
 *   <HiveSteps.Step title="步骤1" description="这是描述" />
 *   <HiveSteps.Step title="步骤2" description="这是描述" />
 *   <HiveSteps.Step title="步骤3" description="这是描述" />
 * </HiveSteps>
 *
 * // 垂直步骤条 / Vertical steps
 * <HiveSteps current={1} direction="vertical">
 *   <HiveSteps.Step title="步骤1" description="描述" />
 *   <HiveSteps.Step title="步骤2" description="描述" />
 * </HiveSteps>
 *
 * // 带图标的步骤条 / Steps with icons
 * <HiveSteps current={1}>
 *   <HiveSteps.Step title="完成" icon={<IconCheck />} />
 *   <HiveSteps.Step title="进行中" icon={<IconLoading />} />
 *   <HiveSteps.Step title="待处理" icon={<IconClock />} />
 * </HiveSteps>
 *
 * // 迷你版步骤条 / Mini steps
 * <HiveSteps current={1} size="small" type="dot">
 *   <HiveSteps.Step title="步骤1" />
 *   <HiveSteps.Step title="步骤2" />
 *   <HiveSteps.Step title="步骤3" />
 * </HiveSteps>
 * ```
 *
 * @see arco-override.css for custom styles (.hivemind-steps)
 */
const HiveSteps: React.FC<HiveStepsProps> & { Step: typeof Steps.Step } = ({ className, ...props }) => {
  return <Steps {...props} className={classNames('hivemind-steps', className)} />;
};

HiveSteps.displayName = 'HiveSteps';

// 导出子组件 / Export sub-component
HiveSteps.Step = Steps.Step;

export default HiveSteps;
