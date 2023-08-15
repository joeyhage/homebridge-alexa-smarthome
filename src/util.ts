import fs from 'fs';
import type { PlatformConfig } from 'homebridge';
import { Nullable } from './domain';
import { Authentication } from './domain/alexa';
import type { AlexaPlatformConfig } from './domain/homebridge';

export const validateConfig = (config: PlatformConfig): config is AlexaPlatformConfig => {
  if (
    config &&
    config.platform === 'HomebridgeAlexaSmartHome' &&
    ['undefined', 'boolean'].includes(typeof config.debug)
  ) {
    return true;
  }
  throw new Error('Unknown configuration error');
};

export const isValidAuthentication = (
  maybeCookieData: Nullable<Record<string, string | object | number>>,
): maybeCookieData is Authentication => {
  return (
    !!maybeCookieData &&
    typeof maybeCookieData.localCookie === 'string' &&
    typeof maybeCookieData.macDms === 'object' &&
    typeof maybeCookieData.deviceSerial === 'string' &&
    typeof maybeCookieData.deviceId === 'string' &&
    typeof maybeCookieData.deviceAppName === 'string' &&
    typeof maybeCookieData.refreshToken === 'string'
  );
};

export const getAuthentication = (persistPath: string): Authentication | undefined => {
  if (fs.existsSync(persistPath)) {
    const maybeAuth = JSON.parse(fs.readFileSync(persistPath, { encoding: 'utf-8' }) ?? '{}');
    const maybeCookieData = typeof maybeAuth === 'object' ? maybeAuth.cookieData : {};
    return isValidAuthentication(maybeCookieData) ? maybeCookieData : undefined;
  }
  return undefined;
};
