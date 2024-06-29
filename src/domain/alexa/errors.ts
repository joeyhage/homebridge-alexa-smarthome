import { Nullable } from '../index';
import { SmartHomeDevice } from './get-devices';
import { SupportedDeviceTypes } from './index';

export abstract class AlexaError extends Error {
  constructor(message: string, public readonly name: string) {
    super(message);
    this.message = `${name}(${message})`;
  }
}

export abstract class AlexaApiError extends AlexaError {}

export class InvalidRequest extends AlexaApiError {
  constructor(message: string) {
    super(message, InvalidRequest.name);
  }
}

export class InvalidResponse extends AlexaApiError {
  constructor(message: string) {
    super(message, InvalidResponse.name);
  }
}

export class HttpError extends AlexaApiError {
  constructor(message: string) {
    super(message, HttpError.name);
  }
}

export class RequestUnsuccessful extends AlexaApiError {
  constructor(message: string, public readonly errorCode: Nullable<string>) {
    super(
      `${message}${errorCode ? `. Error code: ${errorCode}` : ''}`,
      RequestUnsuccessful.name,
    );
  }
}

export class TimeoutError extends AlexaApiError {
  constructor(message: string) {
    super(message, TimeoutError.name);
  }
}

export class DeviceOffline extends AlexaApiError {
  public static readonly code = 'ENDPOINT_UNREACHABLE';
  constructor() {
    super(DeviceOffline.code, DeviceOffline.name);
  }
}

export abstract class AlexaDeviceError extends AlexaError {}

export class UnsupportedDeviceError extends AlexaDeviceError {
  constructor(device: SmartHomeDevice) {
    super(
      `Unsupported device: ${device.displayName} with type: ${device.deviceType}. ` +
        `Currently supported device types are: ${SupportedDeviceTypes}.`,
      UnsupportedDeviceError.name,
    );
  }
}

export class InvalidDeviceError extends AlexaDeviceError {
  constructor(device: SmartHomeDevice) {
    super(
      `Unable to determine device type for: ${device.displayName}`,
      InvalidDeviceError.name,
    );
  }
}
