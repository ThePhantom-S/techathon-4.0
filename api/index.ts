import { getApp } from '../server.js';

process.env.VERCEL = process.env.VERCEL || '1';

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    // If Vercel rewrote /api/... to /api, extract the original path from query or headers
    const rawUrl = req.url || '/api';
    const parsed = new URL(rawUrl, 'http://localhost');
    const pathParam = parsed.searchParams.get('__path');

    if (pathParam !== null && pathParam !== undefined) {
      parsed.searchParams.delete('__path');
      const cleanPath = pathParam.startsWith('/') ? pathParam : '/' + pathParam;
      const search = parsed.searchParams.toString();
      req.url = '/api' + (cleanPath === '/' ? '' : cleanPath) + (search ? '?' + search : '');
    } else {
      const matched =
        req.headers['x-matched-path'] ||
        req.headers['x-vercel-matched-path'] ||
        req.headers['x-forwarded-uri'] ||
        req.headers['x-original-url'];
      if (matched && typeof matched === 'string' && matched.startsWith('/api')) {
        req.url = matched;
      }
    }

    // If Vercel pre-parsed the body, flag it so express.json() doesn't hang on an already drained stream
    if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
      req._body = true;
    }

    if (!appPromise) {
      appPromise = getApp();
    }

    const app = await appPromise;

    return new Promise((resolve) => {
      // Ensure the serverless lambda does not terminate before the response completes
      const originalEnd = res.end;
      res.end = function (...args: any[]) {
        const result = originalEnd.apply(this, args);
        resolve(result);
        return result;
      };

      app(req, res, (err: any) => {
        if (err && !res.headersSent) {
          console.error('Unhandled serverless error in Express:', err);
          res.status(500).json({ error: 'Internal Server Error', detail: err?.message || String(err) });
        } else if (!res.headersSent) {
          res.status(404).json({ error: 'Route not found', url: req.url });
        }
        resolve(undefined);
      });
    });
  } catch (outerErr: any) {
    console.error('Fatal serverless function error:', outerErr);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fatal Server Error', detail: outerErr?.message || String(outerErr) });
    }
  }
}