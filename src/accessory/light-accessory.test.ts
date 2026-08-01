/* eslint-disable @typescript-eslint/no-explicit-any */
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { HomebridgeAPI } from 'homebridge/lib/api';
import AlexaRemote from 'alexa-remote2';
import { HttpError } from '../domain/alexa/errors';
import { AlexaSmartHomePlatform } from '../platform';
import DeviceStore from '../store/device-store';
import { AlexaApiWrapper } from '../wrapper/alexa-api-wrapper';
import LightAccessory from './light-accessory';

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
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
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
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
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
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
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

describe('handleHueGet', () => {
  test('should throw an error if color state not available and no colorTemperature either', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
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
    const hue = acc.handleHueGet();

    // then
    await expect(hue).rejects.toStrictEqual(acc.serviceCommunicationError);
  });

  test('should default to 0 when color is missing but colorTemperature is present', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.ColorTemperatureController',
              name: 'colorTemperatureInKelvin',
              value: 3000,
            }),
          ],
        },
      }),
    );

    // when
    const hue = acc.handleHueGet();

    // then
    await expect(hue).resolves.toBe(0);
  });
});

describe('handleSaturationGet', () => {
  test('should scale a 0-1 fraction saturation to a 0-100 percentage', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.ColorController',
              name: 'color',
              value: { hue: 240, saturation: 1, brightness: 1 },
            }),
          ],
        },
      }),
    );

    // when
    const saturation = acc.handleSaturationGet();

    // then
    await expect(saturation).resolves.toBe(100);
  });

  test('should not re-scale a saturation value already reported as 0-100', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.ColorController',
              name: 'color',
              value: { hue: 240, saturation: 100, brightness: 1 },
            }),
          ],
        },
      }),
    );

    // when
    const saturation = acc.handleSaturationGet();

    // then
    await expect(saturation).resolves.toBe(100);
  });

  test('should default to 0 when color is missing but colorTemperature is present', async () => {
    // given
    const acc = createLightAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getDeviceStateGraphQl.mockReturnValueOnce(
      TE.of({
        fromCache: false,
        statesByDevice: {
          [acc.device.id]: [
            O.of({
              namespace: 'Alexa.ColorTemperatureController',
              name: 'colorTemperatureInKelvin',
              value: 3000,
            }),
          ],
        },
      }),
    );

    // when
    const saturation = acc.handleSaturationGet();

    // then
    await expect(saturation).resolves.toBe(0);
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
