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

beforeEach(() => {
  jest.clearAllMocks();
});

global.MockLogger = new Logger();

global.createPlatform = (): AlexaSmartHomePlatform =>
  new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    new HomebridgeAPI(),
  );

global.createPlatformConfig = (): AlexaPlatformConfig => ({
  platform: 'HomebridgeAlexaSmartHome',
  amazonDomain: 'amazon.com',
  devices: [],
  auth: {
    refreshInterval: 0,
    proxy: {
      clientHost: 'localhost',
      port: 2345,
    },
  },
  language: 'en-US',
  debug: true,
});
