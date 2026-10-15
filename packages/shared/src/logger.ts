import pino from 'pino';
import { serialize } from './serialize';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: false,
        },
      },
  hooks: {
    logMethod(args, method) {
      if (args.length === 0) {
        method.apply(this, args);
        return;
      }
      if (typeof args[0] === 'object' && args[0] !== null) {
        const rest = args.slice(1) as (string | undefined)[];
        method.apply(this, [serialize(args[0]), ...rest]);
      } else {
        method.apply(this, args);
      }
    },
  },
});

export function createLogger(scope: string) {
  return logger.child({ scope });
}
