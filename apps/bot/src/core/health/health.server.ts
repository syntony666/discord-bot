import http, { IncomingMessage, ServerResponse } from 'http';

export type HealthServer = {
  close: () => Promise<void>;
};

export type StatusPayload = {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }>;
};

type StatusProvider = () => Promise<StatusPayload>;

function handleStatusRequest(provider: StatusProvider) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' || req.url !== '/status') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    try {
      const payload = await provider();
      res.statusCode = payload.status === 'ok' ? 200 : 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'error',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          checks: {
            status: {
              ok: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        })
      );
    }
  };
}

export function startHealthServer(port: number, provider: StatusProvider): HealthServer {
  const server = http.createServer(handleStatusRequest(provider));

  server.listen(port);

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
