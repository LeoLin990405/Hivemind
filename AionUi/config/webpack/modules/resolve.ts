import { paths } from '../config/paths';
import path from 'path';

interface ResolveOptions {
  extraExtensions?: string[];
  extraAliases?: Record&lt;string, string&gt;;
  extraFallbacks?: Record&lt;string, string | false&gt;;
}

export function createResolveConfig(options: ResolveOptions = {}) {
  const { extraExtensions = [], extraAliases = {}, extraFallbacks = {} } = options;

  return {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', ...extraExtensions],
    alias: {
      '@': paths.src,
      '@common': paths.common,
      '@renderer': paths.renderer,
      '@process': paths.process,
      '@worker': paths.worker,
      ...extraAliases,
    },
    fallback: {
      ...extraFallbacks,
    },
  };
}

export const mainResolveConfig = createResolveConfig({
  extraAliases: {
    '@xterm/headless$': path.resolve(paths.root, 'src/shims/xterm-headless.ts'),
  },
});

export const rendererResolveConfig = createResolveConfig({
  extraExtensions: ['.css'],
  extraAliases: {
    'process/browser': require.resolve('process/browser.js'),
    'streamdown': path.resolve(paths.root, 'node_modules/streamdown/dist/index.js'),
  },
  extraFallbacks: {
    'crypto': false,
    'node:crypto': false,
    'stream': require.resolve('stream-browserify'),
    'buffer': require.resolve('buffer'),
    'process': require.resolve('process/browser.js'),
    'process/browser': require.resolve('process/browser.js'),
    'zlib': false,
    'util': false,
  },
});
