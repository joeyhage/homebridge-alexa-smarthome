import { Nullable } from './domain';

export abstract class AlexaApiError extends Error {
  public readonly message: string;

  constructor(message: string, public readonly name: string) {
    super(message);
    this.message = `${this.name}(${message})`;
  }
}

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
  public readonly message: string;

  constructor(message: string, public readonly errorCode: Nullable<string>) {
    super(
      `${message}${errorCode ? `. Error code: ${errorCode}` : ''}`,
      RequestUnsuccessful.name,
    );
  }
}

export class DeviceOffline extends AlexaApiError {
  public static readonly code = 'ENDPOINT_UNREACHABLE';
  constructor() {
    super(DeviceOffline.code, DeviceOffline.name);
  }
}

export abstract class PluginError extends Error {
  public readonly message: string;

  constructor(message: string, public readonly name: string) {
    super(message);
    this.message = `${this.name}(${message})`;
  }
}

export class JsonFormatError extends PluginError {
  constructor(message: string) {
    super(message, JsonFormatError.name);
  }
}

export class ValidationError extends PluginError {
  constructor(message: string) {
    super(message, ValidationError.name);
  }
}

export class IoError extends PluginError {
  constructor(message: string) {
    super(message, IoError.name);
  }
}
