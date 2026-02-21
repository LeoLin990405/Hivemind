/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { HIVEMIND_PROVIDER_OPTIONS, PROVIDER_TIERS } from '@/agent/hivemind/types';
import { Button } from '@/renderer/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import SendBox from '@/renderer/components/sendbox';
import { tokens } from '@/renderer/design-tokens';
import type { IAgentTeammate } from '@/common/ipcBridge';

interface TeamChatSendBoxProps {
  teamId: string;
  teammates: IAgentTeammate[];
  loading?: boolean;
  disabled?: boolean;
  onSend?: (message: string, provider: string | null, model: string | null) => void;
}

const TeamChatSendBox: React.FC<TeamChatSendBoxProps> = ({ teamId, teammates, loading = false, disabled = false, onSend }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Build provider options from teammates + standard gateway options
  const providerOptions = useMemo(() => {
    const teammateProviders = teammates
      .filter((tm) => tm.status !== 'offline')
      .map((tm) => ({
        value: tm.provider,
        label: `${PROVIDER_TIERS[tm.provider]?.emoji ?? '🤖'} ${tm.name} (${tm.provider}/${tm.model})`,
      }));

    // Deduplicate and merge with standard options
    const seen = new Set(teammateProviders.map((p) => p.value));
    const standardOptions = HIVEMIND_PROVIDER_OPTIONS.filter((opt) => !seen.has(opt.value) || opt.value === '' || opt.value.startsWith('@'));

    return [
      { value: '', label: '🧠 Auto (Smart Route)' },
      ...teammateProviders,
      ...standardOptions.filter((opt) => opt.value !== ''),
    ];
  }, [teammates]);

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      const provider = selectedProvider || null;
      const model: string | null = null;

      if (onSend) {
        onSend(message, provider, model);
      }

      try {
        await ipcBridge.agentTeams.teamChat.send.invoke({
          team_id: teamId,
          message,
          provider,
          model,
        });
      } catch (error) {
        console.error('[TeamChatSendBox] Failed to send:', error);
      }

      setContent('');
    },
    [teamId, selectedProvider, onSend],
  );

  const providerSelector = useMemo(
    () => (
      <Select
        value={selectedProvider ?? ''}
        onValueChange={(value: string) => setSelectedProvider(value || null)}
        disabled={loading}
      >
        <SelectTrigger className='w-[180px] h-7 text-xs' style={{ borderRadius: tokens.radius.md }}>
          <SelectValue placeholder={t('hivemind.selectProvider')}>
            {providerOptions.find((opt) => opt.value === (selectedProvider ?? ''))?.label ?? '🧠 Auto'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {providerOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className='text-xs'>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    [selectedProvider, loading, providerOptions, t],
  );

  return (
    <div className='max-w-800px w-full mx-auto flex flex-col'>
      <SendBox
        value={content}
        onChange={setContent}
        loading={loading}
        disabled={disabled || loading}
        placeholder={loading ? t('hivemind.processing') : t('agentTeams.chatPlaceholder', { defaultValue: 'Chat with your team...' })}
        sendButtonPrefix={providerSelector}
        defaultMultiLine
        lockMultiLine
        onSend={handleSend}
      />
    </div>
  );
};

export default TeamChatSendBox;
