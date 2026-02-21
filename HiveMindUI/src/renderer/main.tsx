/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppShell } from './layouts';
import PanelRoute from './router';
import { useAuth } from './context/AuthContext';

const Main = () => {
  const { ready } = useAuth();

  if (!ready) {
    return null;
  }

  return <PanelRoute layout={<AppShell />} />;
};

export default Main;
