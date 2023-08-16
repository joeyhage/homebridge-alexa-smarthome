import { DeviceResponse } from './index';

export interface CapabilityState {
  namespace: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface DeviceStateResponse extends DeviceResponse {
  capabilityStates: string[];
}

export default interface GetDeviceStateResponse {
  deviceStates: DeviceStateResponse[];
  errors: DeviceResponse[];
}
