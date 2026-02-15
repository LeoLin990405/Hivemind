/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Layout from './layout';
import Router from './router';
import Sider from './sider';
import { useAuth } from './context/AuthContext';
import { NEXUS_UI_ENABLED } from './config/uiMode';
import NexusApp from './nexus/app/NexusApp';

const Main = () => {
  const { ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (NEXUS_UI_ENABLED) {
    return <NexusApp />;
  }

  return <Router layout={<Layout sider={<Sider />} />} />;
};

export default Main;
