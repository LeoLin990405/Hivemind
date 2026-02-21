/**
 * Standalone WebUI launcher:
 * - backend: Node standalone server (port 25808 by default)
 * - frontend: Vite dev server (port 9000 by default)
 *
 * This bypasses Electron Forge so WebUI no longer depends on desktop app lifecycle.
 */

const { spawn } = require('child_process');

const isProd = process.argv.includes('--prod');
const isRemote = process.argv.includes('--remote');
const noFrontend = process.env.HIVEMIND_WEBUI_NO_FRONTEND === '1' || isProd;

const backendScript = isProd ? (isRemote ? 'server:remote' : 'server:prod') : isRemote ? 'server:remote' : 'server';
const frontendScript = noFrontend ? null : 'dev:web';
const frontendPort = process.env.VITE_DEV_PORT || '9000';

const children = [];
let shuttingDown = false;

function start(name, command, args, envOverrides = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const normalizedCode = typeof code === 'number' ? code : 1;
    const reason = signal ? `signal=${signal}` : `code=${normalizedCode}`;
    console.error(`[WebUI] ${name} exited (${reason})`);
    shutdown(normalizedCode);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 1500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[WebUI] Starting standalone workflow...');
console.log(`[WebUI] Backend script: ${backendScript}`);
if (frontendScript) {
  console.log(`[WebUI] Frontend script: ${frontendScript} (http://localhost:${frontendPort})`);
} else {
  console.log('[WebUI] Frontend disabled (production backend-only mode)');
}

start('backend', 'npm', ['run', backendScript]);

if (frontendScript) {
  start('frontend', 'npm', ['run', frontendScript], {
    VITE_DEV_PORT: frontendPort,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:25808',
  });
}
