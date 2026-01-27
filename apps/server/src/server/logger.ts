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

export function logger(message: string, level: LoggerLevels) {
  if (loggerInstance) {
    switch (level) {
      case 'debug':
        loggerInstance.info(message).catch(err => {
          console.log(err);
        });
        break;
      case 'info':
        loggerInstance.info(message).catch(err => {
          console.info(err);
        });
        break;
      case 'warn':
        loggerInstance.warn(message).catch(err => {
          console.warn(err);
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
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}
