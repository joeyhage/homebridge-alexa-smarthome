import AlexaRemote, {
  CallbackWithErrorAndBody,
  EntityType,
} from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { match } from 'fp-ts/boolean';
import { constVoid, pipe } from 'fp-ts/lib/function';
import GetDeviceStateResponse from '../domain/alexa/get-device-state';
import GetDevicesResponse from '../domain/alexa/get-devices';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import {
  AlexaApiError,
  HttpError,
  InvalidRequest,
  RequestUnsuccessful,
} from '../errors';

const ENTITY_ID_REGEX = new RegExp(
  /[\da-fA-F]{8}-(?:[\da-fA-F]{4}-){3}[\da-fA-F]{12}/,
);

export class AlexaApiWrapper {
  constructor(private readonly alexaRemote: AlexaRemote) {}

  async getDevices(): Promise<Either<AlexaApiError, GetDevicesResponse>> {
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
    )();
  }

  async setLightbulbState(
    deviceId: string,
    action: 'turnOn' | 'turnOff' | 'setBrightness',
    parameters: Record<string, string> = {},
    entityType: EntityType = 'APPLIANCE',
  ): Promise<Either<AlexaApiError, void>> {
    return pipe(
      TE.bindTo('entityId')(AlexaApiWrapper.extractEntityId(deviceId)),
      TE.flatMap(({ entityId }) =>
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
    )();
  }

  async getLightbulbState(
    deviceId: string,
    entityType: EntityType | 'ENTITY' = 'ENTITY',
  ): Promise<Either<AlexaApiError, GetDeviceStateResponse>> {
    return pipe(
      TE.bindTo('entityId')(AlexaApiWrapper.extractEntityId(deviceId)),
      TE.flatMap(({ entityId }) =>
        TE.tryCatch(
          () =>
            AlexaApiWrapper.toPromise<GetDeviceStateResponse>(
              this.alexaRemote.querySmarthomeDevices.bind(
                this.alexaRemote,
                [entityId],
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
    )();
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

  private static extractEntityId(
    id: string,
  ): TaskEither<AlexaApiError, string> {
    const entityIdMatches = id.match(ENTITY_ID_REGEX);
    return TE.fromEither(
      match(
        () =>
          E.left(
            new InvalidRequest(`id: ${id} is not a valid Smart Home device id`),
          ),
        () => E.right(entityIdMatches![0]),
      )(!!entityIdMatches),
    );
  }

  private static whereSetStateSuccessful = TE.fromPredicate<
    AlexaApiError,
    SetDeviceStateResponse
  >(
    (response) =>
      response.controlResponses?.[0].code === 'SUCCESS' &&
      (response.errors?.length ?? 0) === 0,
    (response) =>
      new RequestUnsuccessful(
        'Error setting smart home device state',
        response.errors?.[0].code,
      ),
  );

  private static whereGetStateSuccessful = TE.fromPredicate<
    AlexaApiError,
    GetDeviceStateResponse
  >(
    (response) =>
      response.deviceStates?.length > 0 && (response.errors?.length ?? 0) === 0,
    (response) =>
      new RequestUnsuccessful(
        'Error getting smart home device state',
        response.errors?.[0].code,
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
