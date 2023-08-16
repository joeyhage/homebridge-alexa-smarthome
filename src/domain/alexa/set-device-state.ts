import { DeviceResponse } from './index';

export default interface SetDeviceStateResponse {
  controlResponses: DeviceResponse[];
  errors: DeviceResponse[];
}
