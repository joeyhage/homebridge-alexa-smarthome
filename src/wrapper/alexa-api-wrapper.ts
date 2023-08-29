import AlexaRemote, {
  CallbackWithErrorAndBody,
  EntityType,
} from 'alexa-remote2';
import { Mutex, MutexInterface, withTimeout } from 'async-mutex';
import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { Option, Some } from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RRecord from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { Json } from 'fp-ts/lib/Json';
import { match as fpMatch } from 'fp-ts/lib/boolean';
import {
  constFalse,
  constTrue,
  constVoid,
  constant,
  flow,
  identity,
  pipe,
} from 'fp-ts/lib/function';
import { Pattern, match } from 'ts-pattern';
import { Nullable } from '../domain';
import {
  CapabilityState,
  SupportedActionsType,
  SupportedNamespacesType,
} from '../domain/alexa';
import {
  AlexaApiError,
  DeviceOffline,
  HttpError,
  InvalidResponse,
  RequestUnsuccessful,
  TimeoutError,
} from '../domain/alexa/errors';
import GetDeviceStatesResponse, {
  CapabilityStates,
  CapabilityStatesByDevice,
  OptionalCapabilityStates,
  ValidCapabilityStates,
  ValidStatesByDevice,
} from '../domain/alexa/get-device-states';
import GetDevicesResponse from '../domain/alexa/get-devices';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import * as util from '../util';
import { PluginLogger } from '../util/plugin-logger';

export interface DeviceStatesCache {
  lastUpdated: Date;
  cachedStates: ValidStatesByDevice;
}

export class AlexaApiWrapper {
  private readonly mutex: MutexInterface;
  public readonly deviceStatesCache: DeviceStatesCache = {
    lastUpdated: new Date(0),
    cachedStates: {},
  };

  constructor(
    private readonly alexaRemote: AlexaRemote,
    private readonly log: PluginLogger,
    private readonly cacheTTL = 30_000,
  ) {
    this.mutex = withTimeout(
      new Mutex(new TimeoutError('Alexa API Timeout')),
      30_000,
    );
  }

  getCacheValue(deviceId: string, namespace: SupportedNamespacesType) {
    return pipe(
      this.deviceStatesCache.cachedStates,
      RRecord.lookup(deviceId),
      O.flatMap(
        A.findFirstMap((cache) =>
          pipe(
            cache,
            O.exists(({ namespace: cachedNS }) => cachedNS === namespace),
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
              O.flatMap(identity),
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

  updateCacheValue(
    deviceId: string,
    newState: {
      namespace: SupportedNamespacesType;
      value: string | number | boolean;
    },
  ) {
    pipe(
      this.getCacheValue(deviceId, newState.namespace),
      O.tap((cs) => {
        cs.value = newState.value;
        return O.of(cs);
      }),
    );
    return this.deviceStatesCache.cachedStates;
  }

  getDevices(): TaskEither<AlexaApiError, GetDevicesResponse> {
    return TE.tryCatch(
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
              TE.flatMapEither(AlexaApiWrapper.validateGetStatesSuccessful),
              TE.map(AlexaApiWrapper.extractCapabilityStates),
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
      TE.flatMapEither(AlexaApiWrapper.validateSetStateSuccessful),
      TE.map(constVoid),
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

  private static validateSetStateSuccessful = E.fromPredicate<
    SetDeviceStateResponse,
    AlexaApiError
  >(
    (response) =>
      match(response)
        .with(
          {
            controlResponses: Pattern.intersection(
              Pattern.not([]),
              Pattern.array({ code: 'SUCCESS' }),
            ),
          },
          constTrue,
        )
        .otherwise(constFalse),
    (r) =>
      new RequestUnsuccessful(
        `Error setting smart home device state. Response: ${JSON.stringify(r)}`,
        r.errors?.[0]?.code,
      ),
  );

  private static validateGetStatesSuccessful = E.fromPredicate<
    GetDeviceStatesResponse,
    AlexaApiError
  >(
    (response) =>
      match(response)
        .with({ deviceStates: Pattern.not([]) }, constTrue)
        .otherwise(constFalse),
    (response) =>
      match(response)
        .with(
          {
            deviceStates: Pattern.optional([]),
            errors: [{ code: DeviceOffline.code }],
          },
          constant(new DeviceOffline()),
        )
        .otherwise(
          (r) =>
            new RequestUnsuccessful(
              `Error getting smart home device state. Response: ${JSON.stringify(
                r,
              )}`,
              r.errors?.[0]?.code,
            ),
        ),
  );

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

  private static extractCapabilityStates(
    getDeviceStatesResponse: GetDeviceStatesResponse,
  ): CapabilityStates {
    const toCapabilityStates = (
      capabilityStates: Nullable<string[]>,
    ): OptionalCapabilityStates => {
      return O.Functor.map(
        O.fromNullable(capabilityStates),
        flow(
          A.map(util.parseJson),
          A.map(AlexaApiWrapper.validateCapabilityState),
          A.filter(
            (
              maybeCs,
            ): maybeCs is Either<AlexaApiError, Some<CapabilityState>> =>
              E.isLeft(maybeCs) || E.exists(O.isSome)(maybeCs),
          ),
          A.map(E.map(({ value }) => value)),
        ),
      );
    };

    return pipe(
      O.fromNullable(getDeviceStatesResponse.deviceStates),
      O.map(
        A.reduce({} as CapabilityStatesByDevice, (acc, cur) => {
          acc[cur.entity.entityId] = toCapabilityStates(cur.capabilityStates);
          return acc;
        }),
      ),
      O.map((statesByDevice) => ({ statesByDevice, fromCache: false })),
      O.getOrElse(
        constant({ statesByDevice: {}, fromCache: false } as CapabilityStates),
      ),
    );
  }

  private static validateCapabilityState = E.bimap(
    (e: AlexaApiError) => new InvalidResponse(e.message),
    (j: Json) =>
      match(j)
        .with(
          {
            namespace: Pattern.select('namespace', Pattern.string),
            value: Pattern.union(
              Pattern.select('value', Pattern.string),
              Pattern.select('value', Pattern.number),
              Pattern.select('value', Pattern.boolean),
              { name: Pattern.select('value', Pattern.string) },
            ),
            name: Pattern.select('name', Pattern._),
          },
          (jr) => O.of(jr as CapabilityState),
        )
        .otherwise(constant(O.none)),
  );

  private doesCacheContainAllIds = (cachedIds: string[], queryIds: string[]) =>
    queryIds.every((id) => {
      return cachedIds.includes(id);
    });

  private isCacheFresh = () =>
    this.deviceStatesCache.lastUpdated.getTime() >
    new Date().getTime() - this.cacheTTL;
}
