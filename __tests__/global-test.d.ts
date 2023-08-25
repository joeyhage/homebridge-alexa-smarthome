/* eslint-disable no-var */
import type { Logger } from 'homebridge';
import type { AlexaSmartHomePlatform } from '../src/platform';
import type { AlexaPlatformConfig } from '../src/domain/homebridge';

export {};

declare global {
  var MockLogger: Logger;
  var createPlatform: () => AlexaSmartHomePlatform;
  var createPlatformConfig: () => AlexaPlatformConfig;
}
