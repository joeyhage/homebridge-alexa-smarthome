import { constFalse, constTrue } from 'fp-ts/lib/function';
import fs from 'fs';
import type { PlatformConfig } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { Nullable } from './domain';
import { Authentication } from './domain/alexa';
import type { AlexaPlatformConfig } from './domain/homebridge';

export const validateConfig = (
  config: PlatformConfig,
): config is AlexaPlatformConfig =>
  match(config)
    .with(
      {
        platform: 'HomebridgeAlexaSmartHome',
        amazonDomain: Pattern.optional(Pattern.string),
        auth: {
          refreshInterval: Pattern.optional(Pattern.number),
          proxy: { clientHost: Pattern.string, port: Pattern.number },
        },
        language: Pattern.optional(Pattern.string),
        devices: Pattern.optional(Pattern.array(Pattern.string)),
        debug: Pattern.optional(Pattern.boolean),
      },
      constTrue,
    )
    .otherwise(() => {
      throw new Error('Unknown configuration error');
    });

export const isValidAuthentication = (
  maybeCookieData: Nullable<Record<string, string | object | number>>,
): maybeCookieData is Authentication =>
  match(maybeCookieData?.cookieData ?? maybeCookieData)
    .with(
      {
        localCookie: Pattern.string,
        deviceSerial: Pattern.string,
        deviceId: Pattern.string,
        deviceAppName: Pattern.string,
        refreshToken: Pattern.string,
        macDms: {
          device_private_key: Pattern.string,
          adp_token: Pattern.string,
        },
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
