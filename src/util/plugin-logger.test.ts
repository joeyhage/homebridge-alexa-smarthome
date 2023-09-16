import { PlatformConfig } from 'homebridge';
import { DeviceOffline } from '../domain/alexa/errors';
import { PluginLogger } from './plugin-logger';
import { JsonFormatError } from '../domain/homebridge/errors';

describe('errorT', () => {
  test('should log DeviceOffline at info level when debug enabled', () => {
    // given
    const mockLogger = global.MockLogger;
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
    const mockLogger = global.MockLogger;
    const logger = new PluginLogger(mockLogger, {
      debug: true,
    } as unknown as PlatformConfig);

    // when
    logger.errorT('TEST', 'fake error')();

    // then
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('TEST - fake error');
  });

  test('should log error and cause', () => {
    // given
    const mockLogger = global.MockLogger;
    const logger = new PluginLogger(mockLogger, {
      debug: true,
    } as unknown as PlatformConfig);

    // when
    logger.errorT('TEST', new JsonFormatError('bad json', new Error('an example cause')))();

    // then
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('TEST - JsonFormatError(bad json). Caused by - an example cause');
  });
});
