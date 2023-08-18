import { HAPStatus, HapStatusError } from 'hap-nodejs';
import { Nullable } from './domain';

export abstract class AlexaApiError {
  public readonly name = 'AlexaApiError';
  public readonly message: string;

  constructor(message: string, public readonly code: string) {
    this.message = `${this.code}(${this.message})`;
  }
}

export class InvalidRequest extends AlexaApiError {
  constructor(message: string) {
    super(message, 'InvalidRequest');
  }
}

export class InvalidResponse extends AlexaApiError {
  constructor(message: string) {
    super(message, 'InvalidResponse');
  }
}

export class HttpError extends AlexaApiError {
  constructor(message: string) {
    super(message, 'HttpError');
  }
}

export class RequestUnsuccessful extends AlexaApiError {
  public readonly message: string;
  public readonly code = 'RequestUnsuccessful';

  constructor(message: string, public readonly errorCode: Nullable<string>) {
    super(
      `${message}${errorCode ? `. Error code: ${errorCode}` : ''}`,
      'RequestUnsuccessful',
    );
  }
}

export class DeviceOffline extends AlexaApiError {
  constructor() {
    super('ENDPOINT_UNREACHABLE', 'DeviceOffline');
  }
}

export abstract class PlatformError extends HapStatusError {}

export class ServiceCommunicationFailure extends PlatformError {
  constructor() {
    super(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }
}
