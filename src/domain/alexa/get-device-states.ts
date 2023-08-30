import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import {
  constant,
  constFalse,
  constTrue,
  flow,
  pipe,
} from 'fp-ts/lib/function';
import { Json } from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import { Option, Some } from 'fp-ts/Option';
import { match, Pattern } from 'ts-pattern';
import * as util from '../../util';
import { Nullable } from '../index';
import {
  AlexaApiError,
  DeviceOffline,
  InvalidResponse,
  RequestUnsuccessful,
} from './errors';
import { CapabilityState, DeviceResponse } from './index';

export const validateGetStatesSuccessful = E.fromPredicate<
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

export const extractCapabilityStates = (
  getDeviceStatesResponse: GetDeviceStatesResponse,
): CapabilityStates => {
  const toCapabilityStates = (
    capabilityStates: Nullable<string[]>,
  ): OptionalCapabilityStates => {
    return O.Functor.map(
      O.fromNullable(capabilityStates),
      flow(
        A.map(util.parseJson),
        A.map(validateCapabilityState),
        A.filter(
          (maybeCs): maybeCs is Either<AlexaApiError, Some<CapabilityState>> =>
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
};

const validateCapabilityState = E.bimap(
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

/* UNVALIDATED */
export type OptionalCapabilityStates = Option<
  Either<AlexaApiError, CapabilityState>[]
>;

export type CapabilityStatesByDevice = Record<string, OptionalCapabilityStates>;

export interface CapabilityStates {
  statesByDevice: CapabilityStatesByDevice;
  fromCache: boolean;
}

/* END UNVALIDATED */

/* VALIDATED */
export type ValidStatesByDevice = Record<string, Option<CapabilityState>[]>;

export interface ValidCapabilityStates {
  statesByDevice: ValidStatesByDevice;
  fromCache: boolean;
}

/* END VALIDATED */

export interface DeviceStateResponse extends DeviceResponse {
  entity: {
    entityId: string;
    entityType: string;
  };
  capabilityStates: Nullable<string[]>;
}

export default interface GetDeviceStatesResponse {
  deviceStates: Nullable<DeviceStateResponse[]>;
  errors: Nullable<DeviceResponse[]>;
}
