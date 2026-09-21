import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

function serializeBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }
  return obj;
}

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: !isProd,
      translateTime: 'SYS:standard',
      singleLine: false,
    },
  },
  hooks: {
    logMethod(args, method, level) {
      if (args.length === 0) {
        method.apply(this, args);
        return;
      }
      if (typeof args[0] === 'object' && args[0] !== null) {
        const rest = args.slice(1) as (string | undefined)[];
        method.apply(this, [serializeBigInt(args[0]), ...rest]);
      } else {
        method.apply(this, args);
      }
    },
  },
});

export function createLogger(scope: string) {
  return logger.child({ scope });
}
