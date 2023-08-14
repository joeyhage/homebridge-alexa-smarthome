import fs from 'fs';
import type { API, PlatformConfig } from 'homebridge';
import SpotifyWebApi from 'spotify-web-api-node';
import { SpotifyDeviceNotFoundError } from './errors';
import { PluginLogger } from './plugin-logger';
import type { HomebridgeSpotifySpeakerDevice, SpotifyPlaybackState, WebapiError } from './types';

const DEFAULT_SPOTIFY_CALLBACK = 'https://example.com/callback';
const DEFAULT_RETRY_DELAY_MS = 2000;

export class SpotifyApiWrapper {
  private readonly authCode: string;
  private readonly persistPath: string;

  private spotifyApi: SpotifyWebApi;
  private enableRetry: boolean;
  private retryDelayMs: number;

  constructor(private readonly logger: PluginLogger, public readonly config: PlatformConfig, public readonly api: API) {
    this.authCode = config.spotifyAuthCode;
    this.persistPath = `${api.user.persistPath()}/.homebridge-spotify-speaker`;
    this.enableRetry = config.deviceNotFoundRetry.enable;

    if (this.enableRetry) {
      this.retryDelayMs =
        typeof config.deviceNotFoundRetry.retryDelay === 'number'
          ? config.deviceNotFoundRetry.retryDelay
          : DEFAULT_RETRY_DELAY_MS;
    } else {
      this.retryDelayMs = 0;
    }

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotifyClientId,
      clientSecret: config.spotifyClientSecret,
      redirectUri: config.spotifyRedirectUri || DEFAULT_SPOTIFY_CALLBACK,
    });
  }

  async authenticate(): Promise<boolean> {
    await this.fetchTokensFromStorage();
    if (this.spotifyApi.getAccessToken()) {
      this.logger.debug('Spotify auth success using saved tokens');
      return true;
    }

    await this.authWithCodeGrant();
    if (this.spotifyApi.getAccessToken()) {
      this.logger.debug('Spotify auth success using authorization code flow');
      return true;
    }

    this.logger.error(
      `We could not fetch the Spotify tokens nor authenticate using the code grant flow.
        Please redo the manual login step, provide the new auth code in the config then try again.`,
    );

    return false;
  }

  persistTokens() {
    if (!this.spotifyApi.getAccessToken() || !this.spotifyApi.getRefreshToken()) {
      return;
    }

    const writeData = JSON.stringify({
      accessToken: this.spotifyApi.getAccessToken(),
      refreshToken: this.spotifyApi.getRefreshToken(),
    });

    try {
      fs.writeFileSync(this.persistPath, writeData);
    } catch (err) {
      this.logger.warn(
        'Failed to persist tokens, the plugin might not be able to authenticate when homebridge restarts:\n\n',
        err,
      );
    }
  }

  async play(deviceId: string, contextUri: string, startAtOffset = 0) {
    const options = {
      device_id: deviceId,
      context_uri: contextUri,
      offset: { position: startAtOffset },
    };

    this.logger.debug(
      `play called with deviceId=${deviceId}, contextUri=${contextUri}. startAtOffset=${startAtOffset}`,
    );
    await this.wrappedRequest(() => this.spotifyApi.play(options));
  }

  async pause(deviceId: string) {
    this.logger.debug(`pause called with deviceId=${deviceId}`);
    await this.wrappedRequest(() => this.spotifyApi.pause({ device_id: deviceId }));
  }

  async getPlaylist(contextUri: string) {
    this.logger.debug(`getPlaylist called with contextUri=${contextUri}`);
    const playlistId = SpotifyApiWrapper.extractPlaylistId(contextUri);
    if (playlistId) {
      const res = await this.wrappedRequest(() => this.spotifyApi.getPlaylist(playlistId, { fields: 'tracks.total' }));
      return res?.body?.tracks?.total ?? 0;
    }
  }

  async getPlaybackState(): Promise<SpotifyPlaybackState | undefined> {
    this.logger.debug('getPlaybackState called');
    return this.wrappedRequest(() => this.spotifyApi.getMyCurrentPlaybackState());
  }

  async setShuffle(state: boolean, deviceId: string) {
    this.logger.debug(`setShuffle called with state=${state}, deviceId=${deviceId}`);
    await this.wrappedRequest(() => this.spotifyApi.setShuffle(state, { device_id: deviceId }));
  }

  async setRepeat(state: HomebridgeSpotifySpeakerDevice['playlistRepeat'], deviceId: string) {
    this.logger.debug(`setRepeat called with state=${state}, deviceId=${deviceId}`);
    await this.wrappedRequest(() => this.spotifyApi.setRepeat(state ? 'context' : 'off', { device_id: deviceId }));
  }

  async setVolume(volume: number, deviceId: string) {
    this.logger.debug(`setVolume called with volume=${volume}, deviceId=${deviceId}`);
    await this.wrappedRequest(() => this.spotifyApi.setVolume(volume, { device_id: deviceId }));
  }

  async getMyDevices(): Promise<SpotifyApi.UserDevice[]> {
    this.logger.debug('getMyDevices called');
    try {
      const res = await this.wrappedRequest(() => this.spotifyApi.getMyDevices());
      return res?.body?.devices ?? [];
    } catch (error) {
      this.logger.error('Failed to fetch available Spotify devices.', error);
      return [];
    }
  }

  private async authWithCodeGrant(): Promise<void> {
    this.logger.debug('Attempting the code grant authorization flow');

    try {
      const data = await this.spotifyApi.authorizationCodeGrant(this.authCode);
      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
    } catch (err) {
      this.logger.error('Could not authorize Spotify:\n\n', JSON.stringify(err));
    }
  }

  private async fetchTokensFromStorage() {
    this.logger.debug('Attempting to fetch tokens saved in the storage');

    let tokens: { accessToken: string; refreshToken: string };
    try {
      tokens = JSON.parse(fs.readFileSync(this.persistPath, { encoding: 'utf-8' }));
    } catch (err) {
      this.logger.debug('Failed to fetch tokens:', err);
      return;
    }

    if (!tokens.accessToken || !tokens.refreshToken) {
      return;
    }

    this.spotifyApi.setAccessToken(tokens.accessToken);
    this.spotifyApi.setRefreshToken(tokens.refreshToken);
    this.logger.debug('Successfully fetched the tokens from storage, going to refresh the access token');

    const areTokensRefreshed = await this.refreshTokens();
    if (!areTokensRefreshed) {
      // Reset the creds since they are wrong, we will try the code auth grant instead.
      this.spotifyApi.resetCredentials();
    }
  }

  async refreshTokens(): Promise<boolean> {
    try {
      const data = await this.spotifyApi.refreshAccessToken();
      this.logger.debug('The access token has been refreshed!');

      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.persistTokens();
    } catch (error: unknown) {
      this.logger.debug('Could not refresh access token:', (error as WebapiError).body);
      return false;
    }

    return true;
  }

  private async wrappedRequest<T>(
    cb: () => Promise<T>,
    isAuthRetry = false,
    isFirstAttempt = true,
  ): Promise<T | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retry = (authRetry = false, onError?: (reason: any) => void): Promise<T | undefined> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this.wrappedRequest(cb, authRetry, authRetry)
            .then(resolve)
            .catch(onError ?? reject);
        }, this.retryDelayMs);
      });
    };

    const throwSpotifyDeviceNotFound = (errorMessage: string): Promise<T | undefined> => {
      return new Promise((_, reject) => {
        this.logger.error('SpotifyDeviceNotFoundError:', JSON.stringify(errorMessage));
        reject(new SpotifyDeviceNotFoundError());
      });
    };

    try {
      const response = await cb();
      return response;
    } catch (error: unknown) {
      let errorMessage = error;
      if (isWebApiError(error)) {
        const webApiError = error as WebapiError;
        errorMessage = webApiError.body;
        if (!isAuthRetry && webApiError.statusCode === 401) {
          this.logger.debug('Access token has expired, attempting token refresh');

          const areTokensRefreshed = await this.refreshTokens();
          if (areTokensRefreshed) {
            return retry(true, (reason) =>
              this.logger.error('Unexpected error retrying request after token refresh:', JSON.stringify(reason)),
            );
          }
        } else if (webApiError.statusCode === 404) {
          this.logger.debug('Spotify device not found while making request.', {
            isAuthRetry,
            isFirstAttempt,
            enableRetry: this.enableRetry,
          });
          return isFirstAttempt && this.enableRetry
            ? retry()
            : throwSpotifyDeviceNotFound(JSON.stringify(errorMessage));
        }
      }

      this.logger.error('Unexpected error when making request to Spotify:', JSON.stringify(errorMessage));
    }
  }

  static extractPlaylistId(playlistUrl: string): string | null {
    try {
      // Empty playlist ID is allowed for cases where one wants to only
      // play or pause one speaker started from an external source.
      if (!playlistUrl) {
        return null;
      }

      return new URL(playlistUrl).pathname.split('/')[2];
    } catch (error) {
      return null;
    }
  }
}

const WebApiErrorTypes = ['WebapiError', 'WebapiRegularError', 'WebapiAuthenticationError', 'WebapiPlayerError'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWebApiError(error: any): boolean {
  return (
    WebApiErrorTypes.includes(error.constructor.name) ||
    WebApiErrorTypes.includes(Object.getPrototypeOf(error.constructor).name) ||
    WebApiErrorTypes.includes(Object.getPrototypeOf(error).constructor.name)
  );
}
