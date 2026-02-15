/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NexusCommandInput - Modern Global Search/Command Input
 *
 * Features:
 * - Clean search-style input with icon
 * - Keyboard shortcut hint
 * - Focus ring effect
 * - Command history support
 */

import { Search } from 'lucide-react';
import React, { useState } from 'react';

interface NexusCommandInputProps {
  /** Callback when command is submitted (Enter key) */
  onSubmit?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Command input component styled as a modern search bar
 */
const NexusCommandInput: React.FC<NexusCommandInputProps> = ({
  onSubmit,
  placeholder = 'Search or enter command...',
}) => {
  const [value, setValue] = useState('');

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && value.trim()) {
      onSubmit?.(value.trim());
      setValue('');
    }
  };

  return (
    <div className="nexus-command-shell">
      {/* Search Icon */}
      <Search size={14} className="text-[var(--nexus-text-tertiary)] shrink-0" />

      {/* Input Field */}
      <input
        className="nexus-command-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        type="text"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Keyboard Shortcut Hint */}
      <span className="nexus-command-shortcut">Enter</span>
    </div>
  );
};

export default NexusCommandInput;
