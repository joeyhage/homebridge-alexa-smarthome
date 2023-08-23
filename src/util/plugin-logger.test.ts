import { PlatformConfig } from 'homebridge';
import { Logger } from 'homebridge/lib/logger';
import { DeviceOffline } from '../errors';
import { PluginLogger } from './plugin-logger';

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
  (Logger as unknown as Logger & { mockClear: () => void }).mockClear();
});

describe('errorT', () => {
  test('should log DeviceOffline at info level when debug enabled', () => {
    // given
    const mockLogger = new Logger('');
    const logger = new PluginLogger(mockLogger, {
      debug: true,
    } as unknown as PlatformConfig);

    // when
    logger.errorT('TEST', new DeviceOffline())();

    // then
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'TEST - DeviceOffline(ENDPOINT_UNREACHABLE)',
    );
  });

  test('should log error with code at error level given error is a string', () => {
    // given
    const mockLogger = new Logger('');
    const logger = new PluginLogger(mockLogger, {
      debug: true,
    } as unknown as PlatformConfig);

    // when
    logger.errorT('TEST', 'fake error')();

    // then
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('TEST - fake error');
  });
});
