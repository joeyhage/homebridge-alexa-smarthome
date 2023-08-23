import * as E from 'fp-ts/Either';
import type { Logger } from 'homebridge';
import { HomebridgeAPI } from 'homebridge/lib/api';
import type { AlexaPlatformConfig } from '../domain/homebridge';
import { AlexaSmartHomePlatform } from '../platform';
import AccessoryFactory from './AccessoryFactory';

describe('createAccessory', () => {
  it('should create a LightAccessory', () => {
    // given
    const device = {
      id: '123',
      displayName: 'test light',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      providerData: {
        enabled: 'true',
        categoryType: 'APPLIANCE',
        deviceType: 'LIGHT',
      },
    };
    const platform = getPlatform();
    const uuid = platform.api.hap.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const lightAcc = AccessoryFactory.createAccessory(
      platform,
      platAcc,
      device,
    );

    // then
    expect(E.isRight(lightAcc)).toBe(true);
  });

  it('should not create an unsupported device', async () => {
    // given
    const device = {
      id: '123',
      displayName: 'test light group',
      description: 'test',
      supportedOperations: [],
      providerData: {
        enabled: 'true',
        categoryType: 'GROUP',
        deviceType: 'OTHER',
      },
    };
    const platform = getPlatform();
    const uuid = platform.api.hap.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const lightAcc = AccessoryFactory.createAccessory(
      platform,
      platAcc,
      device,
    );

    // then
    expect(lightAcc).toStrictEqual(E.left('Unsupported device: test light group.'));
  });
});

function getPlatform(): AlexaSmartHomePlatform {
  const logger = console as Logger;
  return new AlexaSmartHomePlatform(
    logger,
    getPlatformConfig(),
    new HomebridgeAPI(),
  );
}

function getPlatformConfig(): AlexaPlatformConfig {
  return {
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
  };
}
