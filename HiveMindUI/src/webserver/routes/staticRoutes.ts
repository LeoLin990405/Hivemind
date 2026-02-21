/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Express, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { TokenMiddleware } from '@/webserver/auth/middleware/TokenMiddleware';
import { AUTH_CONFIG } from '../config/constants';
import { createRateLimiter } from '../middleware/security';
import * as paths from '@/process/paths';

// Dynamic Electron import
let _electronApp: typeof import('electron').app | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _electronApp = require('electron').app;
  if (typeof _electronApp?.getAppPath !== 'function') _electronApp = null;
} catch {
  _electronApp = null;
}

/**
 * 注册静态资源和页面路由
 * Register static assets and page routes
 */
const resolveRendererPath = () => {
  const appPath = _electronApp ? _electronApp.getAppPath() : paths.getAppRootPath();

  // Webpack assets (Electron mode)
  const webpackRoot = path.join(appPath, '.webpack', 'renderer');
  const webpackIndex = path.join(webpackRoot, 'main_window', 'index.html');
  if (fs.existsSync(webpackIndex)) {
    return { indexHtml: webpackIndex, staticRoot: webpackRoot } as const;
  }

  // Vite build output (standalone mode)
  const viteRoot = path.join(appPath, 'dist', 'web');
  const viteIndex = path.join(viteRoot, 'index.html');
  if (fs.existsSync(viteIndex)) {
    return { indexHtml: viteIndex, staticRoot: viteRoot } as const;
  }

  throw new Error(`Renderer assets not found. Tried:\n  - ${webpackIndex}\n  - ${viteIndex}`);
};

export function registerStaticRoutes(app: Express): void {
  let staticRoot: string;
  let indexHtmlPath: string;
  let hasRendererAssets = true;

  try {
    const resolved = resolveRendererPath();
    staticRoot = resolved.staticRoot;
    indexHtmlPath = resolved.indexHtml;
  } catch (error) {
    // In dev mode with Vite, static assets are served by Vite dev server
    // The Express server only serves API routes
    console.log('[StaticRoutes] No renderer assets found — API-only mode (Vite dev server serves frontend)');
    hasRendererAssets = false;
    staticRoot = '';
    indexHtmlPath = '';
  }

  if (!hasRendererAssets) return;

  // Create a lenient rate limiter for static page requests to prevent DDoS
  const pageRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 300,
    message: 'Too many requests, please try again later',
  });

  const serveApplication = (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const token = TokenMiddleware.extractToken(req);
      if (token && !TokenMiddleware.isTokenValid(token)) {
        res.clearCookie(AUTH_CONFIG.COOKIE.NAME);
      }

      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error serving index.html:', error);
      res.status(500).send('Internal Server Error');
    }
  };

  app.get('/', pageRateLimiter, serveApplication);

  app.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });

  app.get(/^\/(?!api|static|main_window|react|arco|vendors|markdown|codemirror)(?!.*\.[a-zA-Z0-9]+$).*/, pageRateLimiter, serveApplication);

  app.use(express.static(staticRoot));

  const mainWindowDir = path.join(staticRoot, 'main_window');
  if (fs.existsSync(mainWindowDir) && fs.statSync(mainWindowDir).isDirectory()) {
    app.use('/main_window', express.static(mainWindowDir));
  }

  const staticDir = path.join(staticRoot, 'static');
  if (fs.existsSync(staticDir) && fs.statSync(staticDir).isDirectory()) {
    app.use('/static', express.static(staticDir));
  }

  if (fs.existsSync(staticRoot)) {
    app.use(
      '/react-syntax-highlighter_languages_highlight_',
      express.static(staticRoot, {
        setHeaders: (res, filePath) => {
          if (filePath.includes('react-syntax-highlighter_languages_highlight_')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
        },
      })
    );
  }
}

export default registerStaticRoutes;
