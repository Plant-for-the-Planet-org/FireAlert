import {Logtail} from '@logtail/node';
import {env} from '../env.mjs';

// Using Logger will either send logs to Logtail or to the console
// depending on whether or not the BETTERSTACK_LOGTAIL_SOURCE_TOKEN
// environment variable is set

const sourceToken = env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN as string;
let loggerInstance: Logtail | undefined;

if (sourceToken) {
  loggerInstance = new Logtail(sourceToken);
}

type LoggerLevels = 'debug' | 'info' | 'warn' | 'error';

export function logger(message: string | object, level: LoggerLevels) {
  if (typeof message === 'object') {
    message = JSON.stringify(message, null, 2);
  }
  if (loggerInstance) {
    switch (level) {
      case 'debug':
        loggerInstance.debug(message).catch(err => {
          console.error(err);
        });
        break;
      case 'info':
        loggerInstance.info(message).catch(err => {
          console.error(err);
        });
        break;
      case 'warn':
        loggerInstance.warn(message).catch(err => {
          console.error(err);
        });
        break;
      case 'error':
        loggerInstance.error(message).catch(err => {
          console.error(err);
        });
        break;
      default:
        console.error(`Invalid log level: ${level as string}`);
    }
  } else {
    switch (level) {
      case 'debug':
        console.debug(`[DEBUG] ${message}`);
        break;
      case 'info':
        console.info(`[INFO] ${message}`);
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`);
        break;
      case 'error':
        console.error(`[ERROR] ${message}`);
        break;
      default:
        console.error(`[${level.toUpperCase()}] ${message}`);
    }
  }
}
