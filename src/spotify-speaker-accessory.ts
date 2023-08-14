import { Categories, PlatformAccessory, Service } from 'homebridge';
import type { HomebridgeSpotifySpeakerPlatform } from './platform';
import { PluginLogger } from './plugin-logger';
import type { HomebridgeSpotifySpeakerDevice } from './types';

export class SpotifySpeakerAccessory {
  private service: Service;
  private activeState: boolean;
  private currentVolume: number;

  public readonly pollInterval: NodeJS.Timer;

  public static CATEGORY = Categories.LIGHTBULB;
  public static DEVICES: SpotifyApi.UserDevice[] = [];
  public static CURRENT_STATE: SpotifyApi.CurrentPlaybackResponse | undefined = undefined;

  constructor(
    private readonly platform: HomebridgeSpotifySpeakerPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: HomebridgeSpotifySpeakerDevice,
    private readonly logger: PluginLogger,
  ) {
    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb, this.device.deviceName);

    this.service.updateCharacteristic(this.platform.Characteristic.Name, this.device.deviceName);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(this.handleBrightnessGet.bind(this))
      .onSet(this.handleBrightnessSet.bind(this));

    this.activeState = false;
    this.currentVolume = 0;

    this.setInitialState();

    this.pollInterval = setInterval(async () => {
      const oldActiveState = this.activeState;
      const oldVolume = this.currentVolume;

      this.setCurrentStates();

      if (oldActiveState !== this.activeState) {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
      }
      if (oldVolume !== this.currentVolume) {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.currentVolume);
      }
    }, this.platform.pollIntervalSec * 1000);
  }

  handleOnGet(): boolean {
    this.logger.debug('Triggered GET Active:', this.activeState);
    return this.activeState;
  }

  async handleOnSet(value): Promise<void> {
    this.logger.debug('Triggered SET Active:', value);
    if (value === this.activeState) {
      return;
    }

    try {
      if (value) {
        const doShuffle = this.device.playlistShuffle ?? true;
        const offset = await this.chooseRandomOffset(doShuffle);
        await this.platform.spotifyApiWrapper.play(
          this.device.spotifyDeviceId!,
          this.device.spotifyPlaylistUrl,
          offset,
        );
        await this.platform.spotifyApiWrapper.setShuffle(doShuffle, this.device.spotifyDeviceId!);
        await this.platform.spotifyApiWrapper.setRepeat(!!this.device.playlistRepeat, this.device.spotifyDeviceId!);
      } else {
        await this.platform.spotifyApiWrapper.pause(this.device.spotifyDeviceId!);
      }

      this.activeState = value;
    } catch (error) {
      if ((error as Error).name === 'SpotifyDeviceNotFoundError') {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
  }

  async handleBrightnessGet() {
    this.logger.debug('Get volume', this.currentVolume);
    return this.currentVolume;
  }

  async handleBrightnessSet(value): Promise<void> {
    this.logger.debug('Set volume:', value);
    if (value === this.currentVolume) {
      return;
    }

    try {
      await this.platform.spotifyApiWrapper.setVolume(value, this.device.spotifyDeviceId!);
      this.currentVolume = value;
    } catch (error) {
      if ((error as Error).name === 'SpotifyDeviceNotFoundError') {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
  }

  private setInitialState(): void {
    this.setCurrentStates();

    this.logger.debug(`Set initial state // active ${this.activeState} // volume ${this.currentVolume}`);
    this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(this.activeState);
    this.service.getCharacteristic(this.platform.Characteristic.Brightness).updateValue(this.currentVolume);
  }

  private setCurrentStates() {
    if (this.device.spotifyDeviceName) {
      const match = SpotifySpeakerAccessory.DEVICES?.find((device) => device.name === this.device.spotifyDeviceName);
      if (match?.id) {
        this.device.spotifyDeviceId = match.id;
      } else {
        this.logger.error(
          `spotifyDeviceName '${this.device.spotifyDeviceName}' did not match any Spotify devices. spotifyDeviceName is case sensitive.`,
        );
      }
    }

    if (!SpotifySpeakerAccessory.CURRENT_STATE) {
      this.activeState = false;
      this.currentVolume = 0;
      return;
    }

    const playingHref = SpotifySpeakerAccessory.CURRENT_STATE.context?.href;
    const playingDeviceId = SpotifySpeakerAccessory.CURRENT_STATE.device?.id;

    if (SpotifySpeakerAccessory.CURRENT_STATE.is_playing && this.isPlaying(playingHref, playingDeviceId ?? undefined)) {
      this.activeState = SpotifySpeakerAccessory.CURRENT_STATE.is_playing;
      this.currentVolume = SpotifySpeakerAccessory.CURRENT_STATE.device.volume_percent || 0;
    } else {
      this.activeState = false;
      this.currentVolume = 0;
    }
  }

  /**
   * Finds which speaker should be synced.
   *
   * Speakers tied to a playlist will have priority over lone
   * speakers (no playlist ID associated).
   *
   * @param playingHref The href of the currently playing Spotify playlist
   * @param playingDeviceId The spotify device ID
   */
  private isPlaying(playingHref: string | undefined, playingDeviceId: string | undefined) {
    const contextPlaylistId = this.accessory.context.playlistId;

    if (contextPlaylistId && playingHref?.includes(contextPlaylistId)) {
      return true;
    }

    const currentDevicePlaying = this.device.spotifyDeviceId === playingDeviceId;
    const hasHigherPrioritySpeaker = Object.values(this.platform.accessories).some((a) =>
      playingHref?.includes(a.context.playlistId),
    );
    if (currentDevicePlaying && !contextPlaylistId && !hasHigherPrioritySpeaker) {
      return true;
    }

    return false;
  }

  private async chooseRandomOffset(doShuffle: boolean) {
    if (doShuffle) {
      const trackCount = (await this.platform.spotifyApiWrapper.getPlaylist(this.device.spotifyPlaylistUrl)) ?? 0;
      return Math.floor(Math.random() * trackCount);
    } else {
      return 0;
    }
  }
}
