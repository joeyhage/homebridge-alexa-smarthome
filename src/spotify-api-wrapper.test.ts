import { API, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyDeviceNotFoundError } from './errors';
import type { PluginLogger } from './plugin-logger';
import { SpotifyApiWrapper } from './spotify-api-wrapper';
import type { WebapiErrorBody } from './types';
import { WebapiError } from './types';

jest.mock('spotify-web-api-node');
const spotifyWebApiMocks = SpotifyWebApi as jest.MockedClass<typeof SpotifyWebApi>;

beforeEach(() => {
  spotifyWebApiMocks.mockClear();
});

test('should re-attempt wrapped request once on HTTP 404', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState
    .mockRejectedValueOnce(new WebapiError('test', {} as WebapiErrorBody, {}, 404, 'device not found'))
    .mockResolvedValueOnce(fakeCurrentPlaybackResponse);

  // when
  const playbackState = await wrapper.getPlaybackState();

  // then
  expect(playbackState?.body.is_playing).toBe(false);
  expect(mockSpotifyWebApi.getMyCurrentPlaybackState).toHaveBeenCalledTimes(2);
});

test('should throw SpotifyDeviceNotFoundError on second HTTP 404', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState.mockRejectedValue(
    new WebapiError('test', {} as WebapiErrorBody, {}, 404, 'device not found'),
  );

  // when
  const playbackState = wrapper.getPlaybackState();

  // then
  await expect(playbackState).rejects.toThrow(SpotifyDeviceNotFoundError);
  expect(mockSpotifyWebApi.getMyCurrentPlaybackState).toHaveBeenCalledTimes(2);
});

test('should refresh token on HTTP 401', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState
    .mockRejectedValueOnce(new WebapiError('test', {} as WebapiErrorBody, {}, 401, 'unauthorized'))
    .mockResolvedValueOnce(fakeCurrentPlaybackResponse);
  mockSpotifyWebApi.refreshAccessToken.mockResolvedValueOnce(fakeAccessTokenResponse);

  // when
  const playbackState = await wrapper.getPlaybackState();

  // then
  expect(playbackState?.body.is_playing).toBe(false);
  expect(mockSpotifyWebApi.getMyCurrentPlaybackState).toHaveBeenCalledTimes(2);
});

test('should retry once for auth and once for device not found', async () => {
  // given
  const wrapper = getSpotifyApiWrapper();

  const mockSpotifyWebApi = getMockedSpotifyWebApi();
  mockSpotifyWebApi.getMyCurrentPlaybackState
    .mockRejectedValueOnce(new WebapiError('test', {} as WebapiErrorBody, {}, 401, 'unauthorized'))
    .mockRejectedValueOnce(new WebapiError('test', {} as WebapiErrorBody, {}, 404, 'device not found'))
    .mockResolvedValueOnce(fakeCurrentPlaybackResponse);
  mockSpotifyWebApi.refreshAccessToken.mockResolvedValueOnce(fakeAccessTokenResponse);

  // when
  const playbackState = await wrapper.getPlaybackState();

  // then
  expect(playbackState?.body.is_playing).toBe(false);
  expect(mockSpotifyWebApi.getMyCurrentPlaybackState).toHaveBeenCalledTimes(3);
});

function getSpotifyApiWrapper(): SpotifyApiWrapper {
  return new SpotifyApiWrapper(
    console as unknown as PluginLogger,
    {
      spotifyAuthCode: '',
      spotifyClientId: '',
      spotifyClientSecret: '',
      deviceNotFoundRetry: { enable: true, retryDelay: 1 },
    } as unknown as PlatformConfig,
    { user: { persistPath: () => '.' } } as API,
  );
}

function getMockedSpotifyWebApi(): jest.Mocked<SpotifyWebApi> {
  return spotifyWebApiMocks.mock.instances[0] as jest.Mocked<SpotifyWebApi>;
}

const fakeCurrentPlaybackResponse = {
  body: { is_playing: false } as SpotifyApi.CurrentPlaybackResponse,
  headers: {},
  statusCode: 200,
};

const fakeAccessTokenResponse = {
  body: { access_token: 'zzz', expires_in: 0, scope: 'fake_scope', token_type: 'fake_type' },
  headers: {},
  statusCode: 200,
};
