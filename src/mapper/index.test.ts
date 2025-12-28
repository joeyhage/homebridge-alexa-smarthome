import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import {
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import * as mapper from './index';

describe('mapAlexaDeviceToHomeKitAccessoryInfos', () => {
  test('should not create an unsupported device', async () => {
    // given
    const device: SmartHomeDevice = {
      id: '123',
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test light group',
      supportedOperations: [],
      enabled: true,
      deviceType: 'OTHER',
      serialNumber: 'test-serial',
      model: 'test-model',
      manufacturer: 'test-manufacturer',
    };
    const platform = global.createPlatform();

    // when
    const lightAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
      device as SmartHomeDevice,
      false,
    );

    // then
    expect(lightAcc).toStrictEqual(
      E.left(new UnsupportedDeviceError(device as SmartHomeDevice)),
    );
  });

  test('should not create an invalid device', async () => {
    // given
    const device = {
      id: '123',
      displayName: 'test light group',
    } as SmartHomeDevice;
    const platform = global.createPlatform();

    // when
    const lightAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
      device,
      false,
    );

    // then
    expect(lightAcc).toStrictEqual(E.left(new InvalidDeviceError(device)));
  });

  test('should map switch with brightness capability to light bulb accessory', async () => {
    // given
    const device: SmartHomeDevice = {
      id: '123',
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test switch with brightness',
      supportedOperations: ['turnOn', 'turnOff', 'setBrightness'],
      enabled: true,
      deviceType: 'SWITCH',
      serialNumber: 'test-serial',
      model: 'test-model',
      manufacturer: 'test-manufacturer',
    };
    const platform = global.createPlatform();

    // when
    const lightAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
      device,
      false,
    );

    // then
    expect(lightAcc).toStrictEqual(
      E.right([
        {
          altDeviceName: O.none,
          deviceType: platform.Service.Lightbulb.UUID,
          uuid: global.TEST_UUID,
        },
      ]),
    );
  });

  test('should map switch without brightness capability to switch accessory', async () => {
    // given
    const device: SmartHomeDevice = {
      id: '123',
      endpointId: 'amzn1.alexa.endpoint.123',
      displayName: 'test switch',
      supportedOperations: ['turnOn', 'turnOff'],
      enabled: true,
      deviceType: 'SWITCH',
      serialNumber: 'test-serial',
      model: 'test-model',
      manufacturer: 'test-manufacturer',
    };
    const platform = global.createPlatform();

    // when
    const switchAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
      device,
      false,
    );

    // then
    expect(switchAcc).toStrictEqual(
      E.right([
        {
          altDeviceName: O.none,
          deviceType: platform.Service.Switch.UUID,
          uuid: global.TEST_UUID,
        },
      ]),
    );
  });
});
