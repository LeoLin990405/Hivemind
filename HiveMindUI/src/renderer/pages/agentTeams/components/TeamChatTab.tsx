/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { PROVIDER_TIERS } from '@/agent/hivemind/types';
import { useHivemindStatus } from '@/renderer/hooks/useHivemindStatus';
import { Alert } from '@arco-design/web-react';
import { Tag } from '@arco-design/web-react';
import { Badge } from '@/renderer/components/ui/badge';
import { Typography } from '@/renderer/components/atoms/Typography';
import type { IAgentTeammate } from '@/common/ipcBridge';
import TeamChatSendBox from './TeamChatSendBox';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string | null;
  cached?: boolean;
  latencyMs?: number | null;
  timestamp: number;
}

interface TeamChatTabProps {
  teamId: string;
  teammates: IAgentTeammate[];
}

export const TeamChatTab: React.FC<TeamChatTabProps> = ({ teamId, teammates }) => {
  const { t } = useTranslation();
  const { connected, reconnecting } = useHivemindStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Listen for team chat response stream
  useEffect(() => {
    return ipcBridge.agentTeams.teamChat.responseStream.on((event) => {
      if (event.team_id !== teamId) return;

      switch (event.type) {
        case 'start':
          setStreaming(true);
          setStreamingContent('');
          setLastProvider(null);
          break;
        case 'text':
          setStreamingContent((prev) => prev + (typeof event.data === 'string' ? event.data : ''));
          break;
        case 'agent_status': {
          const status = event.data as { backend?: string; cached?: boolean; latencyMs?: number | null };
          if (status.backend) setLastProvider(status.backend);
          break;
        }
        case 'finish':
          setStreaming(false);
          setStreamingContent((prev) => {
            if (prev.trim()) {
              setMessages((msgs) => [
                ...msgs,
                {
                  id: event.msg_id || `msg-${Date.now()}`,
                  role: 'assistant',
                  content: prev,
                  provider: lastProvider,
                  timestamp: Date.now(),
                },
              ]);
            }
            return '';
          });
          break;
        case 'error':
          setStreaming(false);
          setStreamingContent('');
          setMessages((msgs) => [
            ...msgs,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: `Error: ${typeof event.data === 'string' ? event.data : 'Unknown error'}`,
              timestamp: Date.now(),
            },
          ]);
          break;
      }
    });
  }, [teamId, lastProvider]);

  const handleSend = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: Date.now(),
        },
      ]);
    },
    [],
  );

  return (
    <div className='hive-agent-tab-section flex flex-col h-full min-h-[400px]'>
      {!connected && (
        <Alert
          className='mx-4 mt-2 shrink-0'
          type='warning'
          content={reconnecting ? t('hivemind.status.reconnecting') : t('hivemind.status.reconnectFailed')}
          showIcon
          closable
        />
      )}

      {/* Messages area */}
      <div ref={scrollRef} className='flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3'>
        {messages.length === 0 && !streaming && (
          <div className='flex items-center justify-center h-full'>
            <Typography variant='body2' color='secondary'>
              {t('agentTeams.chatEmpty', { defaultValue: 'Start a conversation with your team. Messages are routed through the Gateway API.' })}
            </Typography>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              <Typography variant='body2' className='whitespace-pre-wrap break-words'>
                {msg.content}
              </Typography>
              {msg.provider && (
                <div className='mt-1 flex items-center gap-1'>
                  <Tag size='small' color={PROVIDER_TIERS[msg.provider]?.color ?? 'gray'}>
                    {PROVIDER_TIERS[msg.provider]?.emoji ?? '🤖'} {msg.provider}
                  </Tag>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {streaming && (
          <div className='flex justify-start'>
            <div className='max-w-[80%] rounded-lg px-3 py-2 bg-muted'>
              <Typography variant='body2' className='whitespace-pre-wrap break-words'>
                {streamingContent || '...'}
              </Typography>
              {lastProvider && (
                <Badge variant='outline' className='mt-1 text-xs'>
                  {PROVIDER_TIERS[lastProvider]?.emoji ?? '🤖'} {lastProvider}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Send box */}
      <div className='shrink-0 px-4 pb-3 pt-2 border-t'>
        <TeamChatSendBox
          teamId={teamId}
          teammates={teammates}
          loading={streaming}
          disabled={!connected}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};

export default TeamChatTab;
