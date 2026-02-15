import type { Configuration } from 'webpack';
import { rules } from './modules/rules';
import { basePlugins } from './modules/plugins';
import { mainResolveConfig } from './modules/resolve';
import { mainExternals } from './modules/externals';
import { mainOptimizationConfig } from './modules/optimization';
import { environment } from './config/environment';

  port const mainConfig: Configuration = {
   ode: environment.nodeEnv,
   evtool: environment.isDevelopment ? 'source-map' : false,
   ntry: {
    index: './src/index.ts',
    worker: './src/worker/index.ts',
    gemini: './src/worker/gemini.ts',
    acp: './src/worker/acp.ts',
    codex: './src/worker/codex.ts',
    'openclaw-gateway': './src/worker/openclaw-gateway.ts',
    hivemind: './src/worker/hivemind.ts',
  },
  output: {
    filename: '[name].js',
  },
  module: {
    rules,
  },
  plugins: basePlugins,
  resolve: mainResolveConfig,
  externals: mainExternals,
  optimization: mainOptimizationConfig,
};
