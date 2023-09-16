/* eslint-disable @typescript-eslint/no-explicit-any */
import { IO } from 'fp-ts/IO';
import { LogLevel, type Logger, type PlatformConfig } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { DeviceOffline } from '../domain/alexa/errors';

export type PluginLogLevel = `${LogLevel}`;

export class PluginLogger {
  constructor(
    private readonly logger: Logger,
    public readonly config: PlatformConfig,
  ) {}

  log(message: string, ...parameters: any[]): IO<void> {
    return () => this.logger.log(LogLevel.INFO, message, ...parameters);
  }

  debug(message: string, ...parameters: any[]): IO<void> {
    return () => {
      if (this.config.debug) {
        this.logger.info(message, ...parameters);
      }
    };
  }

  info(message: string, ...parameters: any[]): IO<void> {
    return () => this.logger.info(message, ...parameters);
  }

  warn(message: string, ...parameters: any[]): IO<void> {
    return () => this.logger.warn(message, ...parameters);
  }

  error(message: string, ...parameters: any[]): IO<void> {
    return () => this.logger.error(message, ...parameters);
  }

  errorT(prefix: string, e: any): IO<void> {
    return () =>
      match(e)
        .with(
          { name: DeviceOffline.name, message: Pattern.select(Pattern.string) },
          (m) => this.debug(`${prefix} - ${m}`)(),
        )
        .with(
          {
            message: Pattern.select('message', Pattern.string),
            cause: Pattern.select('cause'),
          },
          ({ cause, message }) => this.errorT(`${prefix} - ${message}. Caused by`, cause)(),
        )
        .with({ message: Pattern.select(Pattern.string) }, (m) =>
          this.logger.error(`${prefix} - ${m}`),
        )
        .with(Pattern.string, (e) => this.logger.error(`${prefix} - ${e}`))
        .otherwise((e) => this.logger.error(`${prefix} - Unknown error`, e));
  }
}
