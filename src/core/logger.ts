import pino from 'pino';
import { serializeBigInt } from './logger/serializer';

const isProd = process.env.NODE_ENV === 'production';

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
  // Hook to serialize objects before logging
  hooks: {
    logMethod(args, method, level) {
      if (args.length === 0) {
        method.apply(this, args);
        return;
      }

      // Serialize the first argument if it's an object (typically the log data)
      if (args.length >= 1 && typeof args[0] === 'object' && args[0] !== null) {
        const serializedFirst = serializeBigInt(args[0]);
        const rest = args.slice(1) as (string | undefined)[];
        method.apply(this, [serializedFirst, ...rest]);
      } else {
        method.apply(this, args);
      }
    },
  },
});

export function createLogger(scope: string) {
  return logger.child({ scope });
}
