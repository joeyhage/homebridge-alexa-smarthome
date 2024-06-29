import { Semaphore, SemaphoreInterface, withTimeout } from 'async-mutex';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { match as fpMatch } from 'fp-ts/boolean';
import { constVoid, constant, pipe } from 'fp-ts/lib/function';
import { match } from 'ts-pattern';
import AlexaRemote, {
  type CallbackWithErrorAndBody,
  type EntityType,
  type MessageCommands,
} from '../alexa-remote.js';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';
import { AlexaApiError, HttpError, TimeoutError } from '../domain/alexa/errors';
import EndpointStateResponse, {
  extractStates,
} from '../domain/alexa/get-device-state.js';
import GetDeviceStatesResponse, {
  ValidCapabilityStates,
  ValidStatesByDevice,
  extractCapabilityStates,
  validateGetStatesSuccessful,
} from '../domain/alexa/get-device-states';
import {
  GetDevicesGraphQlResponse,
  SmartHomeDevice,
  validateGetDevicesSuccessful,
} from '../domain/alexa/get-devices';
import GetPlayerInfoResponse, {
  PlayerInfo,
  validateGetPlayerInfoSuccessful,
} from '../domain/alexa/get-player-info';
import { extractRangeCapabilities } from '../domain/alexa/save-device-capabilities';
import SetDeviceStateResponse, {
  validateSetStateSuccessful,
} from '../domain/alexa/set-device-state';
import DeviceStore from '../store/device-store';
import { PluginLogger } from '../util/plugin-logger';
import {
  EndpointsQuery,
  LightQuery,
  PowerQuery,
  SetEndpointFeatures,
  SwitchQuery,
} from './graphql';

export interface DeviceStatesCache {
  lastUpdated: Date;
  cachedStates: ValidStatesByDevice;
}

export class AlexaApiWrapper {
  private readonly semaphore: SemaphoreInterface;

  constructor(
    private readonly alexaRemote: AlexaRemote,
    private readonly log: PluginLogger,
    private readonly deviceStore: DeviceStore,
  ) {
    this.semaphore = withTimeout(
      new Semaphore(2, new TimeoutError('Alexa API Timeout')),
      65_000,
    );
  }

  getDevices(): TaskEither<AlexaApiError, SmartHomeDevice[]> {
    return pipe(
      TE.tryCatch(
        () =>
          this.executeGraphQlQuery<GetDevicesGraphQlResponse>(EndpointsQuery),
        (reason) =>
          new HttpError(
            `Error getting smart home devices. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
      TE.flatMapEither(validateGetDevicesSuccessful),
      TE.tapIO((devices) => {
        this.deviceStore.deviceCapabilities = extractRangeCapabilities(devices);
        return this.log.debug(
          'Successfully obtained devices and their capabilities',
        );
      }),
    );
  }

  getDeviceStateGraphQl(
    device: SmartHomeDevice,
    useCache,
  ): TaskEither<AlexaApiError, [boolean, CapabilityState[]]> {
    return pipe(
      TE.tryCatch(
        () => this.semaphore.acquire(),
        (e) => e as TimeoutError,
      ),
      TE.map((_) => useCache),
      TE.flatMap(
        fpMatch(
          () =>
            pipe(
              TE.fromIO(
                this.log.debug(`Polling for changes to ${device.displayName}`),
              ),
              TE.map((_) =>
                match(device.deviceType)
                  .with('LIGHT', constant(LightQuery))
                  .with('SWITCH', constant(SwitchQuery))
                  .otherwise(constant(PowerQuery)),
              ),
              TE.flatMap((query) =>
                TE.tryCatch(
                  () =>
                    this.executeGraphQlQuery<EndpointStateResponse>(query, {
                      endpointId: device.endpointId,
                      latencyTolerance: 'LOW',
                    }),
                  (reason) =>
                    new HttpError(
                      `Error getting smart home device state for ${
                        device.displayName
                      }. Reason: ${(reason as Error).message}`,
                    ),
                ),
              ),
              TE.map(extractStates),
              TE.map((states) => {
                this.deviceStore.updateCache([device.id], {
                  [device.id]: O.of(states.map(E.right)),
                });
                return [false, states] as [boolean, CapabilityState[]];
              }),
            ),
          () =>
            pipe(
              TE.of([
                true,
                this.deviceStore.getCacheStatesForDevice(device.id),
              ] as [boolean, CapabilityState[]]),
              TE.tapIO(() =>
                this.log.debug('Obtained device state from cache'),
              ),
            ),
        ),
      ),
      TE.mapBoth(
        (e) => {
          this.semaphore.release();
          return e;
        },
        (res) => {
          this.semaphore.release();
          return res;
        },
      ),
    );
  }

  getDeviceStates(
    deviceIds: string[],
    entityType: EntityType | 'ENTITY' = 'ENTITY',
    useCache = true,
  ): TaskEither<AlexaApiError, ValidCapabilityStates> {
    const shouldReturnCache = () =>
      useCache &&
      this.deviceStore.isCacheFresh() &&
      this.doesCacheContainAllIds(
        Object.keys(this.deviceStore.cache.states),
        deviceIds,
      );

    return pipe(
      TE.tryCatch(
        () => this.semaphore.acquire(),
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
                    statesByDevice: this.deviceStore.updateCache(
                      deviceIds,
                      statesByDevice,
                    ),
                    fromCache: false,
                  } as ValidCapabilityStates),
              ),
            ),
          () =>
            pipe(
              TE.of({
                fromCache: true,
                statesByDevice: this.deviceStore.cache.states,
              } as ValidCapabilityStates),
              TE.tapIO(() =>
                this.log.debug('Obtained device states from cache'),
              ),
            ),
        ),
      ),
      TE.mapBoth(
        (e) => {
          this.semaphore.release();
          return e;
        },
        (res) => {
          this.semaphore.release();
          return res;
        },
      ),
    );
  }

  setDeviceStateGraphQl(
    endpointId: string,
    featureName: string,
    featureOperationName: SupportedActionsType,
    payload: Record<string, string> = {},
  ): TaskEither<AlexaApiError, void> {
    return pipe(
      TE.tryCatch(
        () =>
          this.executeGraphQlQuery<EndpointStateResponse>(SetEndpointFeatures, {
            featureControlRequests: [
              {
                endpointId,
                featureOperationName,
                featureName,
                ...(Object.keys(payload).length > 0 ? { payload } : {}),
              },
            ],
          }),
        (reason) =>
          new HttpError(
            `Error setting smart home device state. Reason: ${
              (reason as Error).message
            }`,
          ),
      ),
      TE.map(constVoid),
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

  private async executeGraphQlQuery<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const flags = {
      method: 'POST',
      data: JSON.stringify({
        query,
        variables,
      }),
    };
    return AlexaApiWrapper.toPromise<T>((cb) =>
      this.alexaRemote.httpsGet(false, '/nexus/v1/graphql', cb, flags),
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
}
