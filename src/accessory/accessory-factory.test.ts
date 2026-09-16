import * as E from 'fp-ts/Either';
import { UnsupportedDeviceError } from '../domain/alexa/errors';
import AccessoryFactory from './accessory-factory';

describe('createAccessory', () => {
  test('should create a LightAccessory', () => {
    // given
    const device = {
      id: '123',
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test light',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      enabled: true,
      deviceType: 'LIGHT',
      serialNumber: 'Unknown',
      model: 'Unknown',
      manufacturer: 'homebridge-alexa-smarthome',
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
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test plug',
      supportedOperations: ['turnOff', 'turnOn'],
      enabled: true,
      deviceType: 'SMARTPLUG',
      serialNumber: 'Unknown',
      model: 'Unknown',
      manufacturer: 'homebridge-alexa-smarthome',
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
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test light group',
      supportedOperations: [],
      enabled: true,
      deviceType: 'OTHER',
      serialNumber: 'Unknown',
      model: 'Unknown',
      manufacturer: 'homebridge-alexa-smarthome',
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
    expect(lightAcc).toStrictEqual(E.left(new UnsupportedDeviceError(device)));
  });
});
