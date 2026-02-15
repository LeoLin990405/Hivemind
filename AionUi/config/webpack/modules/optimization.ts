import type { Configuration } from 'webpack';
import { environment } from '../config/environment';

export function createOptimizationConfig(isRenderer = false): Configuration['optimization'] {
  if (environment.isDevelopment) {
    return {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    };
  }

  if (!isRenderer) {
    return {
      minimize: true,
      realContentHash: true,
    };
  }

  return {
    realContentHash: true,
    minimize: true,
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react',
          priority: 30,
        },
        arco: {
          test: /[\\/]node_modules[\\/]@arco-design[\\/]/,
          name: 'arco',
          priority: 25,
        },
        markdown: {
          test: /[\\/]node_modules[\\/](react-markdown|react-syntax-highlighter|katex|rehype-katex|remark-)[\\/]/,
          name: 'markdown',
          priority: 20,
        },
        codemirror: {
          test: /[\\/]node_modules[\\/](@uiw|@codemirror)[\\/]/,
          name: 'codemirror',
          priority: 20,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  };
}

export const mainOptimizationConfig = createOptimizationConfig(false);
export const rendererOptimizationConfig = createOptimizationConfig(true);
