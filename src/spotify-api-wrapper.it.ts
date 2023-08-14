import { API, PlatformConfig } from 'homebridge';
import type { PluginLogger } from './plugin-logger';
import { SpotifyApiWrapper } from './spotify-api-wrapper';

it('should authenticate and persist tokens', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  // when
  const result = await wrapper.authenticate();
  wrapper.persistTokens();

  // then
  expect(result).toBe(true);
});

it('should retrieve device list', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  // when
  await wrapper.authenticate();
  const devices = await wrapper.getMyDevices();

  // then
  expect(devices?.length).toBeGreaterThan(0);
});

it('should retrieve playback state', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  // when
  await wrapper.authenticate();
  const state = await wrapper.getPlaybackState();

  // then
  expect(state?.statusCode && state?.statusCode >= 200 && state?.statusCode <= 300).toBeTruthy();
});

function getSpotifyApiWrapper(): SpotifyApiWrapper {
  return new SpotifyApiWrapper(
    console as unknown as PluginLogger,
    {
      spotifyAuthCode: process.env.SPOTIFY_AUTH_CODE!,
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID!,
      spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      deviceNotFoundRetry: { enable: false },
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );
}
