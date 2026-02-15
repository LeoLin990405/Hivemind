import type { Configuration } from 'webpack';
import webpack from 'webpack';
import { rules } from './modules/rules';
import { basePlugins } from './modules/plugins';
import { rendererResolveConfig } from './modules/resolve';
import { rendererExternals } from './modules/externals';
import { rendererOptimizationConfig } from './modules/optimization';
import { environment } from './config/environment';

export const rendererConfig: Configuration = {
  mode: environment.nodeEnv,
  devtool: environment.isDevelopment ? 'source-map' : false,
  module: {
    rules,
  },
  plugins: [
    ...basePlugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
  resolve: rendererResolveConfig,
  externals: rendererExternals,
  optimization: rendererOptimizationConfig,
};
