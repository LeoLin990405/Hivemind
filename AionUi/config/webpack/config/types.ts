import type { Configuration } from 'webpack';

export interface WebpackConfigOptions {
  isDevelopment: boolean;
}

export type WebpackConfigFactory = (options: WebpackConfigOptions) =&gt; Configuration;
