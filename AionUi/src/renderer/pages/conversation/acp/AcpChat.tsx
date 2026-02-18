/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import type { AcpBackend } from '@/types/acpTypes';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import React from 'react';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import AcpSendBox from './AcpSendBox';

const AcpChat: React.FC<{
  conversation_id: string;
  workspace?: string;
  backend: AcpBackend;
}> = ({ conversation_id, workspace, backend }) => {
  useMessageLstCache(conversation_id);

  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'acp' }}>
      <div className='hive-chat-scene flex flex-col flex-1 min-h-0 px-20px'>
        <MessageList className='flex-1 min-h-0' />
        <div className='shrink-0 pt-2'>
          <ConversationChatConfirm conversation_id={conversation_id}>
            <AcpSendBox conversation_id={conversation_id} backend={backend}></AcpSendBox>
          </ConversationChatConfirm>
        </div>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(AcpChat);
