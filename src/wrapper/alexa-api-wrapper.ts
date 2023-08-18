import AlexaRemote, {
  CallbackWithErrorAndBody,
  EntityType,
} from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import {
  constFalse,
  constTrue,
  constVoid,
  constant,
  pipe,
} from 'fp-ts/lib/function';
import { Pattern, match } from 'ts-pattern';
import LightAccessory, { LightbulbState } from '../accessory/LightAccessory';
import GetDeviceStatesResponse from '../domain/alexa/get-device-states';
import GetDevicesResponse from '../domain/alexa/get-devices';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import {
  AlexaApiError,
  DeviceOffline,
  HttpError,
  InvalidRequest,
  RequestUnsuccessful,
} from '../errors';
import { PluginLogger } from '../plugin-logger';

const ENTITY_ID_REGEX = new RegExp(
  /[\da-fA-F]{8}-(?:[\da-fA-F]{4}-){3}[\da-fA-F]{12}/,
);

export class AlexaApiWrapper {
  constructor(
    private readonly alexaRemote: AlexaRemote,
    private readonly logger: PluginLogger,
  ) {}

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
  ): TaskEither<AlexaApiError, GetDeviceStatesResponse> {
    const maybeEntityIds = deviceIds.map(AlexaApiWrapper.extractEntityId);
    const { left: errors, right: entityIds } = A.separate(maybeEntityIds);
    errors.forEach((error) =>
      this.logger.warn(
        `Cannot retrieve state for device because ${error.message}`,
      ),
    );
    return pipe(
      TE.bindTo('entityIds')(
        match(entityIds)
          .when(A.isNonEmpty, constant(TE.right(entityIds)))
          .otherwise(
            constant(
              TE.left(
                new InvalidRequest('No valid device ids to retrieve state for'),
              ),
            ),
          ),
      ),
      TE.flatMap(({ entityIds }) =>
        TE.tryCatch(
          () =>
            AlexaApiWrapper.toPromise<GetDeviceStatesResponse>(
              this.alexaRemote.querySmarthomeDevices.bind(
                this.alexaRemote,
                entityIds,
                entityType as EntityType,
                20000,
              ),
            ),
          (reason) =>
            new HttpError(
              `Error getting smart home device state. Reason: ${
                (reason as Error).message
              }`,
            ),
        ),
      ),
      TE.flatMap(AlexaApiWrapper.whereGetStateSuccessful),
    );
  }

  setLightbulbState(
    deviceId: string,
    action: 'turnOn' | 'turnOff' | 'setBrightness',
    parameters: Record<string, string> = {},
    entityType: EntityType = 'APPLIANCE',
  ): TaskEither<AlexaApiError, void> {
    return pipe(
      TE.fromEither(AlexaApiWrapper.extractEntityId(deviceId)),
      TE.flatMap((entityId) =>
        TE.tryCatch(
          () =>
            this.changeDeviceState(
              entityId,
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
      ),
      TE.flatMap(AlexaApiWrapper.whereSetStateSuccessful),
      TE.map(constVoid),
    );
  }

  getLightbulbState(
    deviceId: string,
    entityType: EntityType | 'ENTITY' = 'ENTITY',
  ): TaskEither<AlexaApiError, LightbulbState[]> {
    return pipe(
      this.getDeviceStates([deviceId], entityType),
      TE.map(({ deviceStates }) =>
        pipe(
          deviceStates ?? [],
          A.flatMap(({ capabilityStates }) =>
            LightAccessory.toLightCapabilities(capabilityStates ?? []),
          ),
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

  private static extractEntityId(id: string): Either<AlexaApiError, string> {
    return pipe(
      E.bindTo('matches')(E.right(id.match(ENTITY_ID_REGEX))),
      E.filterOrElse(
        ({ matches }) => !!matches,
        constant(
          new InvalidRequest(`id: '${id}' is not a valid Smart Home device id`),
        ),
      ),
      E.map(({ matches }) => matches![0]),
    );
  }

  private static whereSetStateSuccessful = TE.fromPredicate<
    AlexaApiError,
    SetDeviceStateResponse
  >(
    (response) =>
      match(response)
        .with(
          {
            controlResponses: Pattern.intersection(
              Pattern.not([]),
              Pattern.array({ code: 'SUCCESS' }),
            ),
            errors: Pattern.optional([]),
          },
          constTrue,
        )
        .otherwise(constFalse),
    (response) =>
      new RequestUnsuccessful(
        'Error setting smart home device state',
        response.errors?.[0]?.code,
      ),
  );

  private static whereGetStateSuccessful = TE.fromPredicate<
    AlexaApiError,
    GetDeviceStatesResponse
  >(
    (response) =>
      match(response)
        .with(
          { deviceStates: Pattern.not([]), errors: Pattern.optional([]) },
          constTrue,
        )
        .otherwise(constFalse),
    (response) =>
      match(response)
        .with(
          {
            deviceStates: Pattern.optional([]),
            errors: [{ code: 'ENDPOINT_UNREACHABLE' }],
          },
          constant(new DeviceOffline()),
        )
        .otherwise(
          constant(
            new RequestUnsuccessful(
              'Error getting smart home device state',
              response.errors?.[0]?.code,
            ),
          ),
        ),
  );

  private static async toPromise<T>(
    fn: (cb: CallbackWithErrorAndBody) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      fn((error, body) => {
        if (error) {
          return reject(error);
        } else {
          return resolve(body as T);
        }
      });
    });
  }
}
