import { Either } from 'fp-ts/Either';
import { Option } from 'fp-ts/Option';
import { Nullable } from '../index';
import { AlexaApiError } from './errors';
import { CapabilityState, DeviceResponse } from './index';

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