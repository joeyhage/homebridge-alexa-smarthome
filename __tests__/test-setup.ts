/* eslint-disable no-var */
import { constant } from 'fp-ts/lib/function';
import { HomebridgeAPI } from 'homebridge/lib/api';
import { Logger } from 'homebridge/lib/logger';
import { AlexaPlatformConfig } from '../src/domain/homebridge';
import { AlexaSmartHomePlatform } from '../src/platform';

jest.mock('homebridge/lib/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorT: jest.fn(),
  })),
}));

afterEach(() => {
  jest.clearAllMocks();
});

global.MockLogger = new Logger();

global.TEST_UUID = 'd3588548-bbbb-4c95-b60d-57fea062ca5b';

global.createPlatform = (): AlexaSmartHomePlatform => {
  const api = new HomebridgeAPI();
  api.hap.uuid.generate = constant(TEST_UUID);
  return new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    api,
  );
};

global.createPlatformConfig = (): AlexaPlatformConfig => ({
  platform: 'HomebridgeAlexaSmartHome',
  devices: [],
  excludeDevices: [],
  amazonDomain: 'amazon.com',
  language: 'en-US',
  auth: {
    refreshInterval: 0,
    proxy: {
      clientHost: 'localhost',
      port: 2345,
    },
  },
  performance: {
    cacheTTL: 30,
    backgroundRefresh: false,
  },
  debug: true,
});

declare global {
  var MockLogger: Logger;
  var TEST_UUID: string;
  var createPlatform: () => AlexaSmartHomePlatform;
  var createPlatformConfig: () => AlexaPlatformConfig;
}
