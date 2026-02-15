/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusConversationPage - SaaS Workbench styled conversation page
 * Bento Grid layout with differentiated chat bubbles and centered input
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Paperclip, Mic, Bot, User, Copy, ThumbsUp, Sparkles, Loader2, Image, FileText, Code } from 'lucide-react';
import { ipcBridge } from '@/common';
import useSWR from 'swr';
import type { TChatConversation } from '@/common/storage';
import './NexusConversationPage.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentName?: string;
  agentAvatar?: string;
}

const AGENT_CONFIGS: Record<string, { name: string; color: string }> = {
  kimi: { name: 'Kimi', color: 'var(--nexus-provider-kimi)' },
  qwen: { name: 'Qwen', color: 'var(--nexus-provider-qwen)' },
  gemini: { name: 'Gemini', color: 'var(--nexus-provider-gemini)' },
  codex: { name: 'Codex', color: 'var(--nexus-provider-codex)' },
  deepseek: { name: 'DeepSeek', color: 'var(--nexus-provider-deepseek)' },
  default: { name: 'AI Assistant', color: 'var(--nexus-accent)' },
};

const NexusConversationPage: React.FC = () => {
  const { id } = useParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch conversation data
  const { data: conversation, isLoading } = useSWR<TChatConversation>(`conversation/${id}`, () => ipcBridge.conversation.get.invoke({ id }));

  // Mock messages for demo
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: 'Analyze the current system latency for the Gemini 1.5 Pro endpoint. I am seeing intermittent timeouts.',
      timestamp: '10:42 AM',
    },
    {
      id: '2',
      role: 'assistant',
      content: "I'm checking the telemetry logs for the `gemini-1.5-pro` gateway.\n\nHere is what I found:\n1. **Average Latency**: Spiked to 1.2s (Normal: 400ms)\n2. **Error Rate**: 2.4% over the last 15 minutes.\n\nIt appears there is a congestion issue at the regional load balancer. Would you like me to reroute traffic to the backup node?",
      timestamp: '10:42 AM',
      agentName: 'Gemini',
    },
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput('');
    setIsStreaming(true);

    // Simulate AI response
    setTimeout(() => {
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I've initiated the rerouting sequence. Traffic is now moving through `us-east-2`. Latency has stabilized at 380ms.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentName: 'Codex',
      };
      setMessages((prev) => [...prev, newAiMsg]);
      setIsStreaming(false);
    }, 1500);
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
  };

  const handleCopyFeedback = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className='nexus-conv-loading'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='nexus-conv-shell'>
      {/* Header Area */}
      <div className='nexus-conv-header'>
        <div className='nexus-conv-header__left'>
          <div className='nexus-conv-status-dot' />
          <div className='nexus-conv-header__info'>
            <h2 className='nexus-conv-header__title'>Session #{id?.substring(0, 4)}</h2>
            <p className='nexus-conv-header__meta'>{conversation?.name || 'Gemini Pro'} - Architecture Team</p>
          </div>
        </div>
        <div className='nexus-conv-header__right'>
          <span className='nexus-conv-chip nexus-conv-chip--active'>
            <Bot size={12} />
            <span>2 Agents Active</span>
          </span>
        </div>
      </div>

      {/* Messages Area - Bento Grid Style */}
      <div className='nexus-conv-messages'>
        {messages.map((msg) => (
          <div key={msg.id} className={`nexus-conv-message ${msg.role === 'user' ? 'nexus-conv-message--user' : 'nexus-conv-message--ai'}`}>
            {/* Avatar for AI messages */}
            {msg.role === 'assistant' && (
              <div
                className='nexus-conv-avatar'
                style={{
                  background: AGENT_CONFIGS[msg.agentName?.toLowerCase() || 'default']?.color || AGENT_CONFIGS.default.color,
                }}
              >
                <Bot size={16} />
              </div>
            )}

            {/* Bubble */}
            <div className='nexus-conv-bubble-wrapper'>
              <div className={`nexus-conv-bubble ${msg.role === 'user' ? 'nexus-conv-bubble--user' : 'nexus-conv-bubble--ai'}`}>
                <p className='nexus-conv-bubble__content'>{msg.content}</p>
              </div>

              {/* AI Action Bar */}
              {msg.role === 'assistant' && (
                <div className='nexus-conv-actions'>
                  <button
                    className='nexus-conv-action-btn'
                    onClick={(e) => {
                      handleCopy(msg.content);
                      handleCopyFeedback(e);
                    }}
                    title='Copy'
                  >
                    <Copy size={12} />
                  </button>
                  <button className='nexus-conv-action-btn' title='Like'>
                    <ThumbsUp size={12} />
                  </button>
                  <span className='nexus-conv-timestamp'>{msg.timestamp}</span>
                </div>
              )}

              {/* User timestamp */}
              {msg.role === 'user' && (
                <div className='nexus-conv-actions nexus-conv-actions--user'>
                  <span className='nexus-conv-timestamp'>{msg.timestamp}</span>
                </div>
              )}
            </div>

            {/* Avatar for User messages */}
            {msg.role === 'user' && (
              <div className='nexus-conv-avatar nexus-conv-avatar--user'>
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className='nexus-conv-message nexus-conv-message--ai'>
            <div className='nexus-conv-avatar' style={{ background: 'var(--nexus-accent)' }}>
              <Bot size={16} />
            </div>
            <div className='nexus-conv-bubble-wrapper'>
              <div className='nexus-conv-bubble nexus-conv-bubble--ai nexus-conv-bubble--streaming'>
                <div className='nexus-conv-typing'>
                  <span className='nexus-conv-typing__dot' />
                  <span className='nexus-conv-typing__dot' />
                  <span className='nexus-conv-typing__dot' />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area - Centered, Rich Media */}
      <div className='nexus-conv-input-shell'>
        <div className='nexus-conv-input-container'>
          {/* Rich Media Actions */}
          <div className='nexus-conv-input-actions'>
            <button className='nexus-conv-media-btn' title='Attach File'>
              <Paperclip size={18} />
            </button>
            <button className='nexus-conv-media-btn' title='Upload Image'>
              <Image size={18} />
            </button>
            <button className='nexus-conv-media-btn' title='Insert Code'>
              <Code size={18} />
            </button>
            <button className='nexus-conv-media-btn' title='Add Document'>
              <FileText size={18} />
            </button>
          </div>

          {/* Input Field */}
          <div className='nexus-conv-input-wrapper'>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder='Send a message...'
              className='nexus-conv-input'
              rows={1}
            />
          </div>

          {/* Right Actions */}
          <div className='nexus-conv-input-right'>
            <button className='nexus-conv-enhance-btn' title='Enhance Prompt'>
              <Sparkles size={18} />
            </button>
            <button className='nexus-conv-media-btn' title='Voice Input'>
              <Mic size={18} />
            </button>
            <button onClick={handleSend} disabled={!input.trim() || isStreaming} className={`nexus-conv-send-btn ${input.trim() && !isStreaming ? 'nexus-conv-send-btn--active' : ''}`}>
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className='nexus-conv-disclaimer'>AI agents can make mistakes. Verify critical code outputs.</p>
      </div>
    </div>
  );
};

export default NexusConversationPage;
