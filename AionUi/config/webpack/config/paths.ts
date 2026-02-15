import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '../../../');
export const SRC_DIR = path.resolve(PROJECT_ROOT, 'src');
export const RENDERER_DIR = path.resolve(SRC_DIR, 'renderer');
export const PROCESS_DIR = path.resolve(SRC_DIR, 'process');
export const WORKER_DIR = path.resolve(SRC_DIR, 'worker');
export const COMMON_DIR = path.resolve(SRC_DIR, 'common');
export const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');
export const DIST_DIR = path.resolve(PROJECT_ROOT, '.webpack');

export const paths = {
  root: PROJECT_ROOT,
  src: SRC_DIR,
  renderer: RENDERER_DIR,
  process: PROCESS_DIR,
  worker: WORKER_DIR,
  common: COMMON_DIR,
  public: PUBLIC_DIR,
  dist: DIST_DIR,
};
