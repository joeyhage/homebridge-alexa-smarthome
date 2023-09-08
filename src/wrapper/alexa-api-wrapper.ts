import AlexaRemote, {
  type CallbackWithErrorAndBody,
  type EntityType,
  type MessageCommands,
} from 'alexa-remote2';
import { Mutex, MutexInterface, withTimeout } from 'async-mutex';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RRecord from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { match as fpMatch } from 'fp-ts/boolean';
import { constVoid, constant, pipe } from 'fp-ts/lib/function';
import { Nullable } from '../domain';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';
import { AlexaApiError, HttpError, TimeoutError } from '../domain/alexa/errors';
import GetDeviceStatesResponse, {
  CapabilityStatesByDevice,
  ValidCapabilityStates,
  ValidStatesByDevice,
  extractCapabilityStates,
  validateGetStatesSuccessful,
} from '../domain/alexa/get-device-states';
import GetDevicesResponse, {
  SmartHomeDevice,
  validateGetDevicesSuccessful,
} from '../domain/alexa/get-devices';
import GetPlayerInfoResponse, {
  PlayerInfo,
  validateGetPlayerInfoSuccessful,
} from '../domain/alexa/get-player-info';
import SetDeviceStateResponse, {
  validateSetStateSuccessful,
} from '../domain/alexa/set-device-state';
import { PluginLogger } from '../util/plugin-logger';

export interface DeviceStatesCache {
  lastUpdated: Date;
  cachedStates: ValidStatesByDevice;
}

export class AlexaApiWrapper {
  private readonly mutex: MutexInterface;

  public readonly cacheTTL: number;
  public readonly deviceStatesCache: DeviceStatesCache = {
    lastUpdated: new Date(0),
    cachedStates: {},
  };

  constructor(
    private readonly alexaRemote: AlexaRemote,
    private readonly log: PluginLogger,
    cacheTTL?: Nullable<number>,
  ) {
    this.mutex = withTimeout(
      new Mutex(new TimeoutError('Alexa API Timeout')),
      30_000,
    );
    this.cacheTTL =
      pipe(cacheTTL, O.fromNullable, O.getOrElse(constant(30))) * 1_000;
  }

  getCacheValue(
    deviceId: string,
    { namespace, name }: Omit<CapabilityState, 'value'>,
  ): Option<CapabilityState> {
    return pipe(
      this.deviceStatesCache.cachedStates,
      RRecord.lookup(deviceId),
      O.flatMap(
        A.findFirstMap((cache) =>
          pipe(
            cache,
            O.exists(
              ({ namespace: cachedNS, name: cachedName }) =>
                cachedNS === namespace && (!name || cachedName === name),
            ),
            fpMatch(constant(O.none), constant(cache)),
          ),
        ),
      ),
    );
  }

  updateCache(
    deviceIds: string[],
    statesByDevice: CapabilityStatesByDevice,
  ): ValidStatesByDevice {
    pipe(
      deviceIds,
      A.map((id) => {
        this.deviceStatesCache.cachedStates[id] =
          id in statesByDevice
            ? pipe(
              statesByDevice,
              RRecord.lookup(id),
              O.flatten,
              O.map(A.map(O.getRight)),
              O.getOrElse(constant(new Array<Option<CapabilityState>>())),
            )
            : [];
      }),
      RA.match(constVoid, () => {
        this.deviceStatesCache.lastUpdated = new Date();
      }),
    );
    return this.deviceStatesCache.cachedStates;
  }

  updateCacheValue(deviceId: string, newState: CapabilityState) {
    pipe(
      this.getCacheValue(deviceId, newState),
      O.tap((cs) => {
        cs.value = newState.value;
        return O.of(cs);
      }),
    );
    return this.deviceStatesCache.cachedStates;
  }

  getDevices(): TaskEither<AlexaApiError, SmartHomeDevice[]> {
    return pipe(
      TE.tryCatch(
        () =>
          AlexaApiWrapper.toPromise<GetDevicesResponse>(
            this.alexaRemote.getSmarthomeEntities.bind(this.alexaRemote),
          ),
        (reason) =>
          new HttpError(
            `Error getting smart home devices. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
      TE.flatMapEither(validateGetDevicesSuccessful),
    );
  }

  getDeviceStates(
    deviceIds: string[],
    entityType: EntityType | 'ENTITY' = 'ENTITY',
    useCache = true,
  ): TaskEither<AlexaApiError, ValidCapabilityStates> {
    const shouldReturnCache = () =>
      useCache &&
      this.isCacheFresh() &&
      this.doesCacheContainAllIds(
        Object.keys(this.deviceStatesCache.cachedStates),
        deviceIds,
      );

    return pipe(
      TE.tryCatch(
        () => this.mutex.acquire(),
        (e) => e as TimeoutError,
      ),
      TE.map(shouldReturnCache),
      TE.flatMap(
        fpMatch(
          () =>
            pipe(
              TE.of(deviceIds),
              TE.tapIO(() => this.log.debug('Updating device states')),
              TE.flatMap((entityIds) =>
                this.queryDeviceStates(entityIds, entityType),
              ),
              TE.flatMapEither(validateGetStatesSuccessful),
              TE.map(extractCapabilityStates),
              TE.map(
                ({ statesByDevice }) =>
                  ({
                    statesByDevice: this.updateCache(deviceIds, statesByDevice),
                    fromCache: false,
                  } as ValidCapabilityStates),
              ),
            ),
          () =>
            pipe(
              TE.of({
                fromCache: true,
                statesByDevice: this.deviceStatesCache.cachedStates,
              } as ValidCapabilityStates),
              TE.tapIO(() =>
                this.log.debug('Obtained device states from cache'),
              ),
            ),
        ),
      ),
      TE.mapBoth(
        (e) => {
          this.mutex.release();
          return e;
        },
        (res) => {
          this.mutex.release();
          return res;
        },
      ),
    );
  }

  setDeviceState(
    deviceId: string,
    action: SupportedActionsType,
    parameters: Record<string, string> = {},
    entityType: EntityType = 'APPLIANCE',
  ): TaskEither<AlexaApiError, void> {
    return pipe(
      TE.tryCatch(
        () =>
          this.changeDeviceState(
            deviceId,
            { action, ...parameters },
            entityType,
          ),
        (reason) =>
          new HttpError(
            `Error setting smart home device state. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
      TE.flatMapEither(validateSetStateSuccessful),
      TE.map(constVoid),
    );
  }

  getPlayerInfo(deviceName: string): TaskEither<AlexaApiError, PlayerInfo> {
    return pipe(
      TE.tryCatch(
        () =>
          AlexaApiWrapper.toPromise<GetPlayerInfoResponse>(
            this.alexaRemote.getPlayerInfo.bind(this.alexaRemote, deviceName),
          ),
        (reason) =>
          new HttpError(
            `Error getting media player information. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
      TE.flatMapEither(validateGetPlayerInfoSuccessful),
    );
  }

  setVolume(
    deviceName: string,
    volume: number,
  ): TaskEither<AlexaApiError, void> {
    return pipe(
      TE.tryCatch(
        () =>
          AlexaApiWrapper.toPromise<void>(
            this.alexaRemote.sendMessage.bind(
              this.alexaRemote,
              deviceName,
              'volume',
              volume,
            ),
          ),
        (reason) =>
          new HttpError(
            `Error setting volume. Reason: ${(reason as Error).message}`,
          ),
      ),
    );
  }

  controlMedia(
    deviceName: string,
    command: MessageCommands,
  ): TaskEither<AlexaApiError, void> {
    return pipe(
      TE.tryCatch(
        () =>
          AlexaApiWrapper.toPromise<void>(
            this.alexaRemote.sendMessage.bind(
              this.alexaRemote,
              deviceName,
              command,
              false,
            ),
          ),
        (reason) =>
          new HttpError(
            `Error sending ${command} command to media player. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
    );
  }

  // setVolume(
  //   deviceName: string,
  //   volume: number,
  // ): TaskEither<AlexaApiError, void> {
  //   return pipe(
  //     O.fromNullable(this.alexaRemote.find(deviceName)),
  //     O.filterMap((device: NonNullable<unknown>) =>
  //       typeof device === 'object' && 'deviceType' in device
  //         ? O.of(device as Serial)
  //         : O.none,
  //     ),
  //     TE.fromOption(
  //       constant(new InvalidRequest('Unknown device or serial number')),
  //     ),
  //     TE.flatMap(({ deviceType, serialNumber }) =>
  //       TE.tryCatch(
  //         () =>
  //           this.httpRequest<SetVolumeResponse>(
  //             `/api/devices/${deviceType}/${serialNumber}/audio/v2/speakerVolume`,
  //             {
  //               method: 'POST',
  //               data: JSON.stringify({
  //                 dsn: serialNumber,
  //                 deviceType: deviceType,
  //                 volume,
  //                 muted: false,
  //                 synchronous: true,
  //               }),
  //             },
  //           ),
  //         (reason) =>
  //           new HttpError(
  //             `Error setting device volume. Reason: ${
  //               (reason as Error).message
  //             }`,
  //           ),
  //       ),
  //     ),
  //     TE.flatMapEither(validateSetVolumeSuccessful),
  //     TE.map(constVoid),
  //   );
  // }

  private changeDeviceState(
    entityId: string,
    parameters: Record<string, string>,
    entityType: EntityType = 'APPLIANCE',
  ): Promise<SetDeviceStateResponse> {
    return AlexaApiWrapper.toPromise<SetDeviceStateResponse>(
      this.alexaRemote.executeSmarthomeDeviceAction.bind(
        this.alexaRemote,
        [entityId],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters as any,
        entityType,
      ),
    );
  }

  private static async toPromise<T>(
    fn: (cb: CallbackWithErrorAndBody) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) =>
      fn((error, body) =>
        pipe(
          !!error,
          fpMatch(
            () => resolve(body as T),
            () => reject(error),
          ),
        ),
      ),
    );
  }

  // private async httpRequest<T>(
  //   path: string,
  //   flags: { method: 'GET' | 'POST' | 'PUT'; data: string },
  // ): Promise<T> {
  //   return AlexaApiWrapper.toPromise<T>((cb) =>
  //     this.alexaRemote.httpsGetCall(path, cb, flags),
  //   );
  // }

  private queryDeviceStates(
    entityIds: string[],
    entityType: string,
  ): TE.TaskEither<HttpError, GetDeviceStatesResponse> {
    return TE.tryCatch(
      () =>
        AlexaApiWrapper.toPromise<GetDeviceStatesResponse>(
          this.alexaRemote.querySmarthomeDevices.bind(
            this.alexaRemote,
            entityIds,
            entityType as EntityType,
            20_000,
          ),
        ),
      (reason) =>
        new HttpError(
          `Error getting smart home device state. Reason: ${
            (reason as Error).message
          }`,
        ),
    );
  }

  private doesCacheContainAllIds = (cachedIds: string[], queryIds: string[]) =>
    queryIds.every((id) => {
      return cachedIds.includes(id);
    });

  private isCacheFresh = () =>
    this.deviceStatesCache.lastUpdated.getTime() > Date.now() - this.cacheTTL;
}
