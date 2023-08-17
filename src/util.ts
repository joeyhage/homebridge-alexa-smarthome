import { constFalse, constTrue } from 'fp-ts/lib/function';
import fs from 'fs';
import type { PlatformConfig } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { Nullable } from './domain';
import { Authentication } from './domain/alexa';
import type { AlexaPlatformConfig } from './domain/homebridge';
import { AlexaApiError } from './errors';
import { PluginLogger } from './plugin-logger';

export const logError = (logger: PluginLogger, e: unknown) =>
  match(e)
    .with({ name: 'AlexaApiError' }, (e: AlexaApiError) =>
      logger.error(e.message),
    )
    .otherwise((e) => logger.error('Unknown error', e));

export const validateConfig = (
  config: PlatformConfig,
): config is AlexaPlatformConfig =>
  match(config)
    .with(
      {
        platform: 'HomebridgeAlexaSmartHome',
        debug: Pattern.optional(Pattern.boolean),
        language: Pattern.optional(Pattern.string),
        devices: Pattern.optional(Pattern.array(Pattern.string)),
      },
      constTrue,
    )
    .otherwise(() => {
      throw new Error('Unknown configuration error');
    });

export const isValidAuthentication = (
  maybeCookieData: Nullable<Record<string, string | object | number>>,
): maybeCookieData is Authentication =>
  match(maybeCookieData)
    .with(
      {
        localCookie: Pattern.string,
        deviceSerial: Pattern.string,
        deviceId: Pattern.string,
        deviceAppName: Pattern.string,
        refreshToken: Pattern.string,
        macDms: Pattern.not(Pattern.nullish),
      },
      constTrue,
    )
    .otherwise(constFalse);

export const getAuthentication = (
  persistPath: string,
): Authentication | undefined => {
  if (fs.existsSync(persistPath)) {
    const maybeAuth = JSON.parse(
      fs.readFileSync(persistPath, { encoding: 'utf-8' }) ?? '{}',
    );
    const maybeCookieData =
      typeof maybeAuth === 'object' ? maybeAuth.cookieData : {};
    return isValidAuthentication(maybeCookieData) ? maybeCookieData : undefined;
  }
  return undefined;
};
