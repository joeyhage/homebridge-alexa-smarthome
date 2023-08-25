import * as E from 'fp-ts/Either';
import {
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import AccessoryFactory from './accessory-factory';

describe('createAccessory', () => {
  test('should create a LightAccessory', () => {
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
    const platform = global.createPlatform();
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

  test('should create an OutletAccessory', () => {
    // given
    const device = {
      id: '123',
      displayName: 'test plug',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn'],
      providerData: {
        enabled: 'true',
        categoryType: 'APPLIANCE',
        deviceType: 'SMARTPLUG',
      },
    };
    const platform = global.createPlatform();
    const uuid = platform.api.hap.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const plugAcc = AccessoryFactory.createAccessory(platform, platAcc, device);

    // then
    expect(E.isRight(plugAcc)).toBe(true);
  });

  test('should not create an unsupported device', async () => {
    // given
    const device = {
      id: '123',
      displayName: 'test light group',
      description: 'test',
      supportedOperations: [],
      providerData: {
        enabled: 'true',
        categoryType: 'APPLIANCE',
        deviceType: 'OTHER',
      },
    };
    const platform = global.createPlatform();
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
    expect(lightAcc).toStrictEqual(E.left(new UnsupportedDeviceError(device)));
  });

  test('should not create an invalid device', async () => {
    // given
    const device = {
      id: '123',
      displayName: 'test light group',
    } as SmartHomeDevice;
    const platform = global.createPlatform();
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
    expect(lightAcc).toStrictEqual(E.left(new InvalidDeviceError(device)));
  });
});
