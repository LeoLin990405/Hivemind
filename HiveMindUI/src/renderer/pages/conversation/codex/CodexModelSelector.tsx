/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { AcpBackendAll } from '@/types/acpTypes';
import ModelSelector from '@/renderer/components/ModelSelector';
import { emitter } from '@/renderer/utils/emitter';
import React, { useCallback, useEffect, useState } from 'react';

const CODEX_PROVIDER: AcpBackendAll = 'codex';

const CodexModelSelector: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const [preferredModel, setPreferredModel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const prefs = await ipcBridge.models.getUserPreferences.invoke();
        const selected = prefs.selectedModels?.[CODEX_PROVIDER] ?? null;
        if (selected) {
          if (!cancelled) setPreferredModel(selected);
          return;
        }
        const fallback = await ipcBridge.models.getDefaultModel.invoke({ provider: CODEX_PROVIDER });
        if (!cancelled) setPreferredModel(fallback?.id ?? null);
      } catch {
        if (!cancelled) setPreferredModel(null);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Sync from SendBox model changes
  useEffect(() => {
    const handler = (modelId: string) => setPreferredModel(modelId);
    emitter.on('codex.model.changed', handler);
    return () => { emitter.off('codex.model.changed', handler); };
  }, []);

  const handleChange = useCallback(async (modelId: string) => {
    setPreferredModel(modelId);
    emitter.emit('codex.model.changed', modelId);
    try {
      const prefs = await ipcBridge.models.getUserPreferences.invoke();
      await ipcBridge.models.saveUserPreferences.invoke({
        selectedModels: { ...(prefs.selectedModels || {}), [CODEX_PROVIDER]: modelId },
        lastUpdated: prefs.lastUpdated,
      });
    } catch (error) {
      console.error('[CodexModelSelector] Failed to save model:', error);
    }
  }, []);

  return (
    <ModelSelector
      provider={CODEX_PROVIDER}
      value={preferredModel}
      onChange={(modelId) => void handleChange(modelId)}
      className='w-[160px]'
    />
  );
};

export default CodexModelSelector;
