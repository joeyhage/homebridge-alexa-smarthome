/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel, type Logger, type PlatformConfig } from 'homebridge';

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
}
