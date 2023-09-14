/* eslint-disable @typescript-eslint/no-explicit-any */
import AlexaRemote from 'alexa-remote2';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { HomebridgeAPI } from 'homebridge/lib/api';
import { HttpError } from '../domain/alexa/errors';
import { AlexaSmartHomePlatform } from '../platform';
import { AlexaApiWrapper } from '../wrapper/alexa-api-wrapper';
import LightAccessory from './light-accessory';
import DeviceStore from '../store/device-store';

jest.mock('../wrapper/alexa-api-wrapper.ts');
const alexaApiMocks = AlexaApiWrapper as jest.MockedClass<
  typeof AlexaApiWrapper
>;
jest.mock('../store/device-store.ts');
const deviceStoreMocks = DeviceStore as jest.MockedClass<typeof DeviceStore>;

describe('handlePowerGet', () => {
  test('should determine power state', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStates.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.PowerController',
              name: 'power',
              value: 'ON',
            }),
          ],
        },
      }),
    );

    // when
    const powerState = acc.handlePowerGet();

    // then
    await expect(powerState).resolves.toBe(true);
  });

  test('should throw an error if power state not available', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStates.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.BrightnessController',
              name: 'brightness',
              value: '100',
            }),
          ],
        },
      }),
    );

    // when
    const powerState = acc.handlePowerGet();

    // then
    await expect(powerState).rejects.toStrictEqual(
      acc.serviceCommunicationError,
    );
    expect(global.MockLogger.error).toHaveBeenCalledWith(
      'test light - Get power - InvalidResponse(State not available)',
    );
  });

  test('should log API errors', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStates.mockReturnValueOnce(
      TE.left(new HttpError('bad day')),
    );

    // when
    const powerState = acc.handlePowerGet();

    // then
    await expect(powerState).rejects.toStrictEqual(
      acc.serviceCommunicationError,
    );
    expect(global.MockLogger.error).toHaveBeenCalledWith(
      'test light - Get power - HttpError(bad day)',
    );
  });
});

function createPlatform() {
  const platform = new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    new HomebridgeAPI(),
  );
  (platform as any).deviceStore = new DeviceStore(platform.log);
  (platform as any).alexaApi = new AlexaApiWrapper(
    new AlexaRemote(),
    platform.log,
    platform.deviceStore,
  );
  return platform;
}

function createLightAccessory() {
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
  const platform = createPlatform();
  const uuid = platform.HAP.uuid.generate(device.id);
  const platAcc = new platform.api.platformAccessory(device.displayName, uuid);
  const acc = new LightAccessory(platform, device, platAcc);
  acc.service = platAcc.addService(
    acc.Service.Lightbulb,
    acc.device.displayName,
  );
  return acc;
}

function getMockedAlexaApi(): jest.Mocked<AlexaApiWrapper> {
  const mock = alexaApiMocks.mock.instances[0] as jest.Mocked<AlexaApiWrapper>;
  mockDeviceStore();
  return mock;
}


function mockDeviceStore(): jest.Mocked<DeviceStore> {
  const mock = deviceStoreMocks.mock.instances[0] as jest.Mocked<DeviceStore>;
  mock.getCacheValue.mockReturnValueOnce(O.none);
  return mock;
}
