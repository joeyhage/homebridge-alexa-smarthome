import { Nullable } from '../index';
import { DeviceResponse } from './index';

export interface CapabilityState {
  namespace: string;
  name: Nullable<string>;
  value: string | number | boolean;
}

export interface DeviceStateResponse extends DeviceResponse {
  capabilityStates: Nullable<string[]>;
}

export default interface GetDeviceStatesResponse {
  deviceStates: Nullable<DeviceStateResponse[]>;
  errors: Nullable<DeviceResponse[]>;
}
