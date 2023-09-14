import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import {
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import * as mapper from './index';

describe('mapAlexaDeviceToHomeKitAccessoryInfos', () => {
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

    // when
    const lightAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
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

    // when
    const lightAcc = mapper.mapAlexaDeviceToHomeKitAccessoryInfos(
      platform,
      randomUUID(),
      device,
    );

    // then
    expect(lightAcc).toStrictEqual(E.left(new InvalidDeviceError(device)));
  });
});
