/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel, type Logger, type PlatformConfig } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { DeviceOffline } from './errors';

export type PluginLogLevel = `${LogLevel}`;

export class PluginLogger {
  constructor(
    private readonly logger: Logger,
    private readonly config: PlatformConfig,
  ) {}

  log(message: string, ...parameters: any[]): void {
    this.logger.log(LogLevel.INFO, message, ...parameters);
  }

  debug(message: string, ...parameters: any[]): void {
    if (this.config.debug) {
      this.logger.info(message, ...parameters);
    }
  }

  info(message: string, ...parameters: any[]): void {
    this.logger.info(message, ...parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    this.logger.warn(message, ...parameters);
  }

  error(message: string, ...parameters: any[]): void {
    this.logger.error(message, ...parameters);
  }

  errorT(prefix: string, e: unknown): void {
    match(e)
      .with(
        { name: DeviceOffline.name, message: Pattern.select(Pattern.string) },
        (m) => this.debug(`${prefix} - ${m}`),
      )
      .with({ message: Pattern.select(Pattern.string) }, (m) =>
        this.logger.error(`${prefix} - ${m}`),
      )
      .with(Pattern.string, (e) => this.logger.error(`${prefix} - ${e}`))
      .otherwise((e) => this.logger.error(`${prefix} - Unknown error`, e));
  }
}
