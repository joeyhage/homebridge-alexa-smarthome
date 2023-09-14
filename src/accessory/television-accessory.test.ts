/* eslint-disable @typescript-eslint/no-explicit-any */
import AlexaRemote from 'alexa-remote2';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { HomebridgeAPI } from 'homebridge/lib/api';
import { AlexaSmartHomePlatform } from '../platform';
import { AlexaApiWrapper } from '../wrapper/alexa-api-wrapper';
import TelevisionAccessory from './television-accessory';
import { constVoid } from 'fp-ts/lib/function';
import DeviceStore from '../store/device-store';

jest.mock('../wrapper/alexa-api-wrapper.ts');
const alexaApiMocks = AlexaApiWrapper as jest.MockedClass<
  typeof AlexaApiWrapper
>;
jest.mock('../store/device-store.ts');
const deviceStoreMocks = DeviceStore as jest.MockedClass<typeof DeviceStore>;

describe('handleVolumeSelectorSet', () => {
  test('should handle volume increment', async () => {
    // given
    const acc = createTelevisionAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getPlayerInfo.mockReturnValueOnce(
      TE.of({
        state: 'PLAYING',
        volume: { muted: false, volume: 8 },
      }),
    );
    mockAlexaApi.setVolume.mockReturnValueOnce(TE.of(constVoid()));

    // when
    const newVolume = acc
      .handleVolumeSelectorSet(acc.Characteristic.VolumeSelector.INCREMENT)
      .then(() => acc.handleVolumeGet());

    // then
    const expectedVolume = 20;
    await expect(newVolume).resolves.toBe(expectedVolume);
    expect(mockAlexaApi.setVolume).toHaveBeenCalledTimes(1);
    expect(mockAlexaApi.setVolume).toHaveBeenCalledWith(
      acc.device.displayName,
      expectedVolume,
    );
  });

  test('should handle volume decrement', async () => {
    // given
    const acc = createTelevisionAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getPlayerInfo.mockReturnValueOnce(
      TE.of({
        state: 'PLAYING',
        volume: { muted: false, volume: 8 },
      }),
    );
    mockAlexaApi.setVolume.mockReturnValueOnce(TE.of(constVoid()));

    // when
    const newVolume = acc
      .handleVolumeSelectorSet(acc.Characteristic.VolumeSelector.DECREMENT)
      .then(() => acc.handleVolumeGet());

    // then
    const expectedVolume = 0;
    await expect(newVolume).resolves.toBe(expectedVolume);
    expect(mockAlexaApi.setVolume).toHaveBeenCalledTimes(1);
    expect(mockAlexaApi.setVolume).toHaveBeenCalledWith(
      acc.device.displayName,
      expectedVolume,
    );
  });
});

describe('handleRemoteKeySet', () => {
  test('should handle play/pause when paused', async () => {
    // given
    const acc = createTelevisionAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getPlayerInfo.mockReturnValueOnce(
      TE.of({
        state: 'PAUSED',
        volume: { muted: false, volume: 8 },
      }),
    );
    mockAlexaApi.controlMedia.mockReturnValueOnce(TE.of(constVoid()));

    // when
    await acc.handleRemoteKeySet(acc.Characteristic.RemoteKey.PLAY_PAUSE);

    // then
    const expectedCommand = 'play';
    expect(acc.playerInfoCache.playerInfo.state).toBe('PLAYING');
    expect(mockAlexaApi.controlMedia).toHaveBeenCalledTimes(1);
    expect(mockAlexaApi.controlMedia).toHaveBeenCalledWith(
      acc.device.displayName,
      expectedCommand,
    );
  });

  test('should handle play/pause when playing', async () => {
    // given
    const acc = createTelevisionAccessory();
    const mockAlexaApi = getMockedAlexaApi();
    mockAlexaApi.getPlayerInfo.mockReturnValueOnce(
      TE.of({
        state: 'PLAYING',
        volume: { muted: false, volume: 8 },
      }),
    );
    mockAlexaApi.controlMedia.mockReturnValueOnce(TE.of(constVoid()));

    // when
    await acc.handleRemoteKeySet(acc.Characteristic.RemoteKey.PLAY_PAUSE);

    // then
    const expectedCommand = 'pause';
    expect(acc.playerInfoCache.playerInfo.state).toBe('PAUSED');
    expect(mockAlexaApi.controlMedia).toHaveBeenCalledTimes(1);
    expect(mockAlexaApi.controlMedia).toHaveBeenCalledWith(
      acc.device.displayName,
      expectedCommand,
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

function createTelevisionAccessory() {
  const device = {
    id: '123',
    displayName: 'test echo',
    description: 'test',
    supportedOperations: [],
    providerData: {
      enabled: true,
      categoryType: 'APPLIANCE',
      deviceType: 'ALEXA_VOICE_ENABLED',
    },
  };
  const platform = createPlatform();
  const uuid = platform.HAP.uuid.generate(device.id);
  const platAcc = new platform.api.platformAccessory(device.displayName, uuid);
  const acc = new TelevisionAccessory(platform, device, platAcc);
  acc.service = platAcc.addService(
    acc.Service.Television,
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
