/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import MessageList from '@renderer/messages/MessageList';
import { MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import React, { useEffect } from 'react';
import LocalImageView from '../../../components/LocalImageView';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import CodexSendBox from './CodexSendBox';

const CodexChat: React.FC<{
  conversation_id: string;
  workspace: string;
}> = ({ conversation_id, workspace }) => {
  useMessageLstCache(conversation_id);
  const updateLocalImage = LocalImageView.useUpdateLocalImage();
  useEffect(() => {
    updateLocalImage({ root: workspace });
  }, [workspace]);
  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'codex' }}>
      <div className='hive-chat-scene flex flex-col flex-1 min-h-0 px-20px'>
        <MessageList className='flex-1 min-h-0' />
        <div className='shrink-0 pt-2'>
          <ConversationChatConfirm conversation_id={conversation_id}>
            <CodexSendBox conversation_id={conversation_id} />
          </ConversationChatConfirm>
        </div>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(CodexChat);
