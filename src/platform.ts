import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SpotifyApiWrapper } from './spotify-api-wrapper';
import { SpotifySpeakerAccessory } from './spotify-speaker-accessory';
import type { HomebridgeSpotifySpeakerDevice } from './types';
import { PluginLogger } from './plugin-logger';

const DEVICE_CLASS_CONFIG_MAP = {
  speaker: SpotifySpeakerAccessory,
};

const DAY_INTERVAL_MS = 60 * 60 * 24 * 1000;
const MINUTE_INTERVAL_MS = 60 * 1000;
const DEFAULT_POLL_INTERVAL_S = 20;

export class HomebridgeSpotifySpeakerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly logger: PluginLogger;
  public readonly spotifyApiWrapper: SpotifyApiWrapper;
  public readonly pollIntervalSec: number;
  public readonly accessories: {
    [uuid: string]: PlatformAccessory;
  } = {};

  constructor(readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.logger = new PluginLogger(log, config);
    this.logger.debug('Finished initializing platform:', this.config.name);

    if (!config.spotifyClientId || !config.spotifyClientSecret || !config.spotifyAuthCode) {
      this.logger.error('Missing configuration for this plugin to work, see the documentation for initial setup');
      return;
    }
    this.pollIntervalSec = config.spotifyPollInterval || DEFAULT_POLL_INTERVAL_S;

    this.spotifyApiWrapper = new SpotifyApiWrapper(this.logger, config, api);

    this.api.on('didFinishLaunching', async () => {
      this.logger.debug('Executed didFinishLaunching callback');

      const isAuthenticated = await this.spotifyApiWrapper.authenticate();
      if (!isAuthenticated) {
        return;
      }

      await this.logAvailableSpotifyDevices();
      await this.setSpotifyPlaybackState();
      this.discoverDevices();
      if (Object.keys(this.accessories).length) {
        setInterval(() => {
          this.setSpotifyDevices();
        }, MINUTE_INTERVAL_MS);

        setInterval(() => {
          this.setSpotifyPlaybackState();
        }, this.pollIntervalSec * 1000);
      }
    });

    // Make sure we have the latest tokens saved
    this.api.on('shutdown', () => {
      this.spotifyApiWrapper.persistTokens();
    });

    setInterval(async () => await this.spotifyApiWrapper.refreshTokens(), DAY_INTERVAL_MS);
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories[accessory.UUID] = accessory;
  }

  discoverDevices() {
    if (!this.config.devices) {
      this.logger.error(
        'The "devices" section is missing in your plugin configuration, please add at least one device.',
      );
      return;
    }

    const cachedAccessoryIds = Object.keys(this.accessories),
      platformAccessories: PlatformAccessory[] = [],
      activeAccessoryIds: string[] = [];

    for (const device of this.config.devices) {
      const deviceClass = this.getDeviceConstructor(device.deviceType);
      if (!deviceClass) {
        continue;
      }
      if (!this.deviceConfigurationIsValid(device)) {
        this.logger.error(
          `${
            device.deviceName ?? 'unknown device'
          } is not configured correctly. See the documentation for initial setup`,
        );
        continue;
      }

      const playlistId = this.extractPlaylistId(device.spotifyPlaylistUrl);
      const uuid = this.api.hap.uuid.generate(
        `${device.deviceName}-${device.spotifyDeviceId ?? device.spotifyDeviceName}`,
      );
      const existingAccessory = this.accessories[uuid];

      const accessory =
        existingAccessory ?? new this.api.platformAccessory(device.deviceName, uuid, deviceClass.CATEGORY);
      accessory.context.device = device;
      accessory.context.playlistId = playlistId;
      new deviceClass(this, accessory, device, this.logger);
      activeAccessoryIds.push(uuid);

      if (existingAccessory) {
        this.logger.info('Restoring existing accessory from cache:', accessory.displayName);
      } else {
        this.logger.info('Adding new accessory:', device.deviceName);
        platformAccessories.push(accessory);
      }
    }

    if (platformAccessories.length) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, platformAccessories);
    }

    const staleAccessories = cachedAccessoryIds
      .filter((cachedId) => !activeAccessoryIds.includes(cachedId))
      .map((id) => this.accessories[id]);

    staleAccessories.forEach((staleAccessory) => {
      this.logger.info(`Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`);
    });

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
    }
  }

  async setSpotifyDevices(): Promise<void> {
    try {
      const devices = await this.spotifyApiWrapper.getMyDevices();
      SpotifySpeakerAccessory.DEVICES = devices;
    } catch {
      this.logger.error('Error setting spotify devices');
    }
  }

  async setSpotifyPlaybackState(): Promise<void> {
    try {
      const state = await this.spotifyApiWrapper.getPlaybackState();
      SpotifySpeakerAccessory.CURRENT_STATE = state?.body;
    } catch {
      this.logger.error('Error setting spotify playback state');
    }
  }

  private extractPlaylistId(playlistUrl: string): string | null {
    const playlistId = SpotifyApiWrapper.extractPlaylistId(playlistUrl);
    if (playlistId) {
      this.logger.debug(`Found playlistId: ${playlistId}`);
    } else {
      this.logger.error(
        `Failed to extract playlist ID, the plugin might behave in an unexpected way.
        Please check the configuration and provide a valid playlist URL`,
      );
    }
    return playlistId;
  }

  private getDeviceConstructor(deviceType): typeof SpotifySpeakerAccessory | null {
    if (!deviceType) {
      this.logger.error('It is missing the `deviceType` in the configuration.');
      return null;
    }

    return DEVICE_CLASS_CONFIG_MAP[deviceType];
  }

  private async logAvailableSpotifyDevices(): Promise<void> {
    await this.setSpotifyDevices();

    if (!SpotifySpeakerAccessory.DEVICES?.length) {
      this.logger.warn(
        'No available spotify devices found, make sure that the speaker you configured is On and visible by Spotify Connect',
      );
    } else {
      this.logger.info('Available Spotify devices', SpotifySpeakerAccessory.DEVICES);
    }
  }

  private deviceConfigurationIsValid(device: HomebridgeSpotifySpeakerDevice) {
    return device.spotifyDeviceId || device.spotifyDeviceName;
  }
}
