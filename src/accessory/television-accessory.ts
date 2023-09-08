import { Mutex, MutexInterface, withTimeout } from 'async-mutex';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { match as fpMatch } from 'fp-ts/boolean';
import { constVoid, constant, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { match } from 'ts-pattern';
import { SupportedActionsType } from '../domain/alexa';
import { EchoNamespaces } from '../domain/alexa/echo';
import { InvalidRequest, TimeoutError } from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { PlayerInfo } from '../domain/alexa/get-player-info';
import { AlexaSmartHomePlatform } from '../platform';
import BaseAccessory from './base-accessory';
import * as mapper from '../mapper/television-mapper';

interface PlayerInfoCache {
  lastUpdated: Date;
  playerInfo: PlayerInfo;
}

export default class TelevisionAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  speakerService: Service;
  namespaces = EchoNamespaces;
  isExternalAccessory = true;

  readonly playerInfoCache: PlayerInfoCache = {
    lastUpdated: new Date(0),
    playerInfo: {},
  };

  private readonly cacheTTL = 30_000;
  private readonly playerInfoMutex: MutexInterface;
  private readonly commandMutex: MutexInterface;

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    public readonly device: SmartHomeDevice,
    public readonly platformAcc: PlatformAccessory,
  ) {
    super(platform, device, platformAcc);
    this.playerInfoMutex = withTimeout(
      new Mutex(new TimeoutError('Media Player Information Timeout')),
      10_000,
    );
    this.commandMutex = withTimeout(
      new Mutex(new TimeoutError('Media Player Command Timeout')),
      15_000,
    );
  }

  configureServices() {
    this.platformAcc.category = this.platform.api.hap.Categories.TELEVISION;
    this.service =
      this.platformAcc.getService(this.Service.Television) ||
      this.platformAcc.addService(
        this.Service.Television,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(() => {
        throw this.readOnlyError;
      });

    this.service
      .getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onGet(constant(1))
      .onSet(() => {
        throw this.readOnlyError;
      });

    this.service
      .getCharacteristic(this.Characteristic.Brightness)
      .onGet(constant(0))
      .onSet(() => {
        throw this.readOnlyError;
      });

    this.service.setCharacteristic(
      this.Characteristic.ConfiguredName,
      this.device.displayName,
    );

    this.service.setCharacteristic(
      this.Characteristic.SleepDiscoveryMode,
      this.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
    );

    const RemoteKey = this.Characteristic.RemoteKey;
    this.service.getCharacteristic(RemoteKey).onSet(async (newValue) => {
      return match(newValue)
        .with(RemoteKey.PLAY_PAUSE, this.handleRemoteKeySet.bind(this))
        .with(RemoteKey.ARROW_LEFT, this.handleRemoteKeySet.bind(this))
        .with(RemoteKey.ARROW_RIGHT, this.handleRemoteKeySet.bind(this))
        .otherwise((key) =>
          this.logWithContext('debug', `Triggered remote key: ${key}`),
        );
    });

    this.speakerService = this.platformAcc.addService(
      this.Service.TelevisionSpeaker,
    );

    this.speakerService
      .setCharacteristic(
        this.Characteristic.Active,
        this.Characteristic.Active.ACTIVE,
      )
      .setCharacteristic(
        this.Characteristic.VolumeControlType,
        this.Characteristic.VolumeControlType.ABSOLUTE,
      );

    this.speakerService
      .getCharacteristic(this.Characteristic.Volume)
      .onGet(this.handleVolumeGet.bind(this))
      .onSet(this.handleVolumeSet.bind(this));

    this.speakerService
      .getCharacteristic(this.Characteristic.VolumeSelector)
      .onGet(() => {
        throw this.notAllowedError;
      })
      .onSet(this.handleVolumeSelectorSet.bind(this));

    this.speakerService
      .getCharacteristic(this.Characteristic.Mute)
      .onGet(async () => (await this.handleVolumeGet()) === 0)
      .onSet(() => {
        throw this.readOnlyError;
      });

    const mediaPlayerService = this.platformAcc.addService(
      this.Service.InputSource,
      'Player',
    );
    mediaPlayerService
      .setCharacteristic(this.Characteristic.Identifier, 1)
      .setCharacteristic(this.Characteristic.ConfiguredName, 'Player')
      .setCharacteristic(this.Characteristic.Name, 'Player')
      .setCharacteristic(
        this.Characteristic.CurrentVisibilityState,
        this.Characteristic.CurrentVisibilityState.SHOWN,
      )
      .setCharacteristic(
        this.Characteristic.IsConfigured,
        this.Characteristic.IsConfigured.CONFIGURED,
      )
      .setCharacteristic(
        this.Characteristic.InputSourceType,
        this.Characteristic.InputSourceType.OTHER,
      );
    this.service.addLinkedService(mediaPlayerService);
  }

  async handleActiveGet(): Promise<number> {
    this.logWithContext('debug', 'Triggered get active');
    return pipe(
      this.getPlayerInfo(),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Get active', e);
          throw this.serviceCommunicationError;
        },
        ({ playerInfo: { state } }) => {
          this.logWithContext(
            'debug',
            'Get active result: ' + JSON.stringify(state),
          );
          return pipe(
            state,
            O.fromNullable,
            O.match(
              constant(this.Characteristic.Active.INACTIVE),
              constant(this.Characteristic.Active.ACTIVE),
            ),
          );
        },
      ),
    )();
  }

  async handleVolumeGet(): Promise<number> {
    return pipe(
      this.getPlayerInfo(),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Get volume', e);
          throw this.serviceCommunicationError;
        },
        ({ playerInfo: { volume } }) => {
          this.logWithContext(
            'debug',
            'Get volume result: ' + JSON.stringify(volume),
          );
          return pipe(
            volume,
            O.fromNullable,
            O.flatMap(({ volume }) => pipe(volume, O.fromNullable)),
            O.match(constant(0), identity),
          );
        },
      ),
    )();
  }

  async handleVolumeSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', 'Triggered set volume:' + value);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    try {
      await pipe(
        TE.tryCatch(
          () => this.commandMutex.acquire(),
          (e) => e as TimeoutError,
        ),
        TE.flatMap(() =>
          this.platform.alexaApi.setVolume(this.device.displayName, value),
        ),
        TE.mapBoth(
          (e) => {
            this.commandMutex.release();
            this.logWithContext('errorT', 'Set volume', e);
            throw this.serviceCommunicationError;
          },
          () => {
            this.commandMutex.release();
            this.playerInfoCache.playerInfo.volume = {
              ...(this.playerInfoCache.playerInfo.volume ?? {}),
              volume: value,
              muted: value === 0,
            };
          },
        ),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'Set volume', e);
      throw this.serviceCommunicationError;
    }
  }

  async handleVolumeSelectorSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', 'Triggered set volume selector:' + value);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const volumeDelta =
      value === this.Characteristic.VolumeSelector.INCREMENT ? 1 : -1;
    await pipe(
      TE.tryCatch(
        () => this.commandMutex.acquire(),
        (e) => e as TimeoutError,
      ),
      TE.flatMap(() => this.getPlayerInfo()),
      TE.map(({ playerInfo: { volume } }) =>
        pipe(
          volume,
          O.fromNullable,
          O.flatMap(({ volume }) => pipe(volume, O.fromNullable)),
          O.match(constant(0), identity),
        ),
      ),
      TE.map((prevVol) =>
        Math.min(
          100,
          Math.max(0, (Math.round(prevVol / 10) + volumeDelta) * 10),
        ),
      ),
      TE.tap((newVolume) =>
        this.platform.alexaApi.setVolume(this.device.displayName, newVolume),
      ),
      TE.mapBoth(
        (e) => {
          this.commandMutex.release();
          this.logWithContext('errorT', 'Set volume selector', e);
          throw this.serviceCommunicationError;
        },
        (newVolume) => {
          this.commandMutex.release();
          this.playerInfoCache.playerInfo.volume = {
            ...(this.playerInfoCache.playerInfo.volume ?? {}),
            volume: newVolume,
            muted: newVolume === 0,
          };
        },
      ),
    )();
  }

  async handleRemoteKeySet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', 'Triggered remote control key:' + value);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    await pipe(
      TE.tryCatch(
        () => this.commandMutex.acquire(),
        (e) => e as TimeoutError,
      ),
      TE.flatMap(this.getPlayerInfo.bind(this)),
      TE.flatMapOption(
        ({ playerInfo: { state } }) =>
          pipe(
            O.fromNullable(state),
            O.flatMap((prevState) =>
              mapper.mapHomeKitCommandToAlexa(
                this.platform.Characteristic,
                prevState,
                value,
              ),
            ),
          ),
        constant(
          new InvalidRequest(
            'Cannot control player because there is no media selected.',
          ),
        ),
      ),
      TE.tap((command) =>
        this.platform.alexaApi.controlMedia(this.device.displayName, command),
      ),
      TE.mapBoth(
        (e) => {
          this.commandMutex.release();
          this.logWithContext('errorT', 'Remote control', e);
          throw this.serviceCommunicationError;
        },
        (command) => {
          match(command)
            .with('play', () => {
              this.playerInfoCache.playerInfo.state = 'PLAYING';
            })
            .with('pause', () => {
              this.playerInfoCache.playerInfo.state = 'PAUSED';
            })
            .otherwise(constVoid);
          this.commandMutex.release();
        },
      ),
    )();
  }

  private getPlayerInfo() {
    return pipe(
      TE.tryCatch(
        () => this.playerInfoMutex.acquire(),
        (e) => e as TimeoutError,
      ),
      TE.map(this.isCacheFresh.bind(this)),
      TE.flatMap(
        fpMatch(
          () =>
            pipe(
              TE.of(this.device.displayName),
              TE.tapIO(() => this.log.debug('Updating player info')),
              TE.flatMap((deviceName) =>
                this.platform.alexaApi.getPlayerInfo(deviceName),
              ),
              TE.map((pi) => {
                this.playerInfoCache.playerInfo = pi;
                this.playerInfoCache.lastUpdated = new Date();
                return {
                  fromCache: false,
                  playerInfo: this.playerInfoCache.playerInfo,
                };
              }),
            ),
          () =>
            pipe(
              TE.of({
                fromCache: true,
                playerInfo: this.playerInfoCache.playerInfo,
              }),
              TE.tapIO(() => this.log.debug('Obtained player info from cache')),
            ),
        ),
      ),
      TE.mapBoth(
        (e) => {
          this.playerInfoMutex.release();
          return e;
        },
        (res) => {
          this.playerInfoMutex.release();
          return res;
        },
      ),
    );
  }

  private isCacheFresh = () =>
    this.playerInfoCache.lastUpdated.getTime() > Date.now() - this.cacheTTL;
}
