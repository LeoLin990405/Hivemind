/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import { useHivemindStatus } from '@/renderer/hooks/useHivemindStatus';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import { Alert } from '@arco-design/web-react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LocalImageView from '../../../components/LocalImageView';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import HivemindSendBox from './HivemindSendBox';

const HivemindChat: React.FC<{
  conversation_id: string;
  workspace?: string;
  gatewayUrl?: string;
}> = ({ conversation_id, workspace }) => {
  useMessageLstCache(conversation_id);
  const updateLocalImage = LocalImageView.useUpdateLocalImage();
  const { t } = useTranslation();
  const { connected, reconnecting } = useHivemindStatus();

  useEffect(() => {
    if (!workspace) {
      return;
    }
    updateLocalImage({ root: workspace });
  }, [workspace, updateLocalImage]);

  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'hivemind' }}>
      <div className='hive-chat-scene flex flex-col flex-1 min-h-0 px-20px'>
        {!connected && <Alert className='hive-chat-warning mx-auto max-w-800px w-full mt-8px shrink-0' type='warning' content={reconnecting ? t('hivemind.status.reconnecting') : t('hivemind.status.reconnectFailed')} showIcon closable />}
        <MessageList className='flex-1 min-h-0' />
        <div className='shrink-0 pt-2'>
          <ConversationChatConfirm conversation_id={conversation_id}>
            <HivemindSendBox conversation_id={conversation_id} />
          </ConversationChatConfirm>
        </div>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(HivemindChat);
