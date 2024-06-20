import * as E from 'fp-ts/Either';
import { UnsupportedDeviceError } from '../domain/alexa/errors';
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
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'LIGHT',
      },
    };
    const platform = global.createPlatform();
    const uuid = platform.HAP.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const lightAcc = AccessoryFactory.createAccessory(
      platform,
      platAcc,
      device,
      platform.Service.Lightbulb.UUID,
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
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'SMARTPLUG',
      },
    };
    const platform = global.createPlatform();
    const uuid = platform.HAP.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const plugAcc = AccessoryFactory.createAccessory(
      platform,
      platAcc,
      device,
      platform.Service.Outlet.UUID,
    );

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
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'OTHER',
      },
    };
    const platform = global.createPlatform();
    const uuid = platform.HAP.uuid.generate(device.id);
    const platAcc = new platform.api.platformAccessory(
      device.displayName,
      uuid,
    );

    // when
    const lightAcc = AccessoryFactory.createAccessory(
      platform,
      platAcc,
      device,
      platform.Service.Battery.UUID,
    );

    // then
    expect(lightAcc).toStrictEqual(
      E.left(new UnsupportedDeviceError(device, 'acc-test')),
    );
  });
});
