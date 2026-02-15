export const mainExternals = {
  'better-sqlite3': 'commonjs better-sqlite3',
  'node-pty': 'commonjs node-pty',
  'playwright': 'commonjs playwright',
  'playwright-core': 'commonjs playwright-core',
  'tree-sitter': 'commonjs tree-sitter',
  'tree-sitter-bash': 'commonjs tree-sitter-bash',
  'web-tree-sitter': 'commonjs web-tree-sitter',
  'web-tree-sitter/tree-sitter.wasm?binary': 'commonjs web-tree-sitter/tree-sitter.wasm',
  'tree-sitter-bash/tree-sitter-bash.wasm?binary': 'commonjs tree-sitter-bash/tree-sitter-bash.wasm',
};

export const rendererExternals = {
  'node:crypto': 'commonjs2 crypto',
  'crypto': 'commonjs2 crypto',
};
