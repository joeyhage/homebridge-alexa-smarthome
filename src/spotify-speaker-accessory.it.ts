import * as hapNodeJs from 'hap-nodejs';
import { API, Characteristic, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { HomebridgeSpotifySpeakerPlatform } from './platform';
import type { PluginLogger } from './plugin-logger';
import { SpotifyApiWrapper } from './spotify-api-wrapper';
import { SpotifySpeakerAccessory } from './spotify-speaker-accessory';

it('set repeat, shuffle, and play', async () => {
  // given
  const apiWrapper = getSpotifyApiWrapper();

  await apiWrapper.authenticate();
  SpotifySpeakerAccessory.DEVICES = await apiWrapper.getMyDevices();

  // when
  const speaker = getSpotifySpeakerAccessory(apiWrapper);
  const result = speaker.handleOnSet(true);

  // then
  clearInterval(speaker.pollInterval);
  await expect(result).resolves.toBeUndefined();
});

function getService(): Service {
  return {
    updateCharacteristic: () => ({} as unknown as Service),
    getCharacteristic: () =>
      ({
        onGet: () =>
          ({
            onSet: () => ({} as unknown as Characteristic),
          } as unknown as Characteristic),
        updateValue: () => ({} as unknown as Characteristic),
      } as unknown as Characteristic),
  } as unknown as Service;
}

function getPlatformAccessory(): PlatformAccessory {
  return { getService } as unknown as PlatformAccessory;
}

function getPlatformConfig(): PlatformConfig {
  return {
    spotifyAuthCode: process.env.SPOTIFY_AUTH_CODE!,
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID!,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    deviceNotFoundRetry: { enable: false },
  } as unknown as PlatformConfig;
}

function getSpotifyApiWrapper(): SpotifyApiWrapper {
  return new SpotifyApiWrapper(console as unknown as PluginLogger, getPlatformConfig(), {
    user: { persistPath: () => '.' },
  } as API);
}

function getSpotifySpeakerAccessory(apiWrapper: SpotifyApiWrapper): SpotifySpeakerAccessory {
  const logger = console as unknown as PluginLogger;
  return new SpotifySpeakerAccessory(
    {
      Characteristic: hapNodeJs.Characteristic,
      Service: hapNodeJs.Service,
      accessories: {},
      api: {},
      config: getPlatformConfig(),
      log: console as Logger,
      logger,
      pollIntervalSec: 20,
      spotifyApiWrapper: apiWrapper,
    } as unknown as HomebridgeSpotifySpeakerPlatform,
    getPlatformAccessory(),
    {
      deviceName: 'test',
      deviceType: 'speaker',
      spotifyDeviceName: process.env.SPOTIFY_DEVICE_NAME!,
      spotifyPlaylistUrl: process.env.SPOTIFY_PLAYLIST_URL!,
      playlistRepeat: true,
      playlistShuffle: true,
    },
    logger,
  );
}
