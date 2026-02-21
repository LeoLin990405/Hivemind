/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { HivemindConnection } from '@/agent/hivemind/HivemindConnection';
import { DEFAULT_HIVEMIND_CONFIG } from '@/agent/hivemind/types';
import type { IAgentProvider, IProviderRunRequest, IProviderRunResult } from './types';

/**
 * GatewayProvider routes Agent Teams tasks through the Gateway API,
 * reusing the existing HivemindConnection HTTP client.
 */
export class GatewayProvider implements IAgentProvider {
  readonly provider: string;
  readonly model: string;
  private connection: HivemindConnection;

  constructor(provider = 'gateway', model = 'auto') {
    this.provider = provider;
    this.model = model;
    this.connection = new HivemindConnection({
      ...DEFAULT_HIVEMIND_CONFIG,
      streaming: false,
      defaultProvider: provider === 'gateway' ? null : provider,
    });
  }

  async healthCheck(): Promise<boolean> {
    return this.connection.checkHealth();
  }

  async run(request: IProviderRunRequest): Promise<IProviderRunResult> {
    try {
      const providerHint = this.provider === 'gateway' ? null : this.provider;
      const modelHint = this.model === 'auto' ? null : this.model;

      const response = await this.connection.ask(
        request.prompt,
        providerHint,
        undefined,
        modelHint,
      );

      const output = response.response ?? response.raw_output ?? '';
      const hasError = response.status === 'error' || !!response.error;

      return {
        success: !hasError,
        provider: response.provider || this.provider,
        model: this.model,
        output: hasError ? undefined : output,
        error: hasError ? (response.error ?? 'Gateway returned error status') : undefined,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        raw: response,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        provider: this.provider,
        model: this.model,
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        error: message,
      };
    }
  }
}
