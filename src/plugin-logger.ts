/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Logger, PlatformConfig } from 'homebridge';

export class PluginLogger {
  constructor(private readonly log: Logger, private readonly config: PlatformConfig) {}

  debug(message: string, ...parameters: any[]): void {
    if (this.config.debug) {
      this.log.info(message, ...parameters);
    }
  }

  info(message: string, ...parameters: any[]): void {
    this.log.info(message, ...parameters);
  }

  warn(message: string, ...parameters: any[]): void {
    this.log.warn(message, ...parameters);
  }

  error(message: string, ...parameters: any[]): void {
    this.log.error(message, ...parameters);
  }
}
