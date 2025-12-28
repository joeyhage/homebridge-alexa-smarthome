import * as E from 'fp-ts/Either';
import * as hapNodeJs from 'hap-nodejs';
import type { API } from 'homebridge';
import { SmartHomeDevice } from './domain/alexa/get-devices';
import { ValidationError } from './domain/homebridge/errors';
import { AlexaSmartHomePlatform } from './platform';

test('should not initialize devices with invalid ids', async () => {
  // given
  const platform = getPlatform();
  const device: SmartHomeDevice = {
    id: '123',
    endpointId: 'amzn1.alexa.endpoint.123',
    displayName: 'test light',
    supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
    enabled: true,
    deviceType: 'LIGHT',
    serialNumber: 'test-serial',
    model: 'test-model',
    manufacturer: 'test-manufacturer',
  };

  // when
  const actual = platform.initAccessories(device)();

  // then
  expect(actual).toStrictEqual(
    E.left(
      new ValidationError("id: '123' is not a valid Smart Home device id"),
    ),
  );
});

function getPlatform(): AlexaSmartHomePlatform {
  return new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    getApi(),
  );
}

function getApi(): API {
  return {
    hap: {
      Service: hapNodeJs.Service,
      Characteristic: hapNodeJs.Characteristic,
    },
    on: () => ({}),
    user: { persistPath: () => '.' },
  } as unknown as API;
}
