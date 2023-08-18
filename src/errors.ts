import { Nullable } from './domain';

export abstract class AlexaApiError {
  public readonly name = 'AlexaApiError';
  abstract code: string;
  abstract message: string;
}

export class InvalidRequest extends AlexaApiError {
  public readonly message: string;
  public readonly code = 'InvalidRequest';

  constructor(message: string) {
    super();
    this.message = `${this.code}(${message})`;
  }
}

export class HttpError extends AlexaApiError {
  public readonly message: string;
  public readonly code = 'HttpError';

  constructor(message: string) {
    super();
    this.message = `${this.code}(${message})`;
  }
}

export class RequestUnsuccessful extends AlexaApiError {
  public readonly message: string;
  public readonly code = 'RequestUnsuccessful';

  constructor(message: string, public readonly errorCode: Nullable<string>) {
    super();
    this.message = `${this.code}(${message}${
      errorCode ? `. Error code: ${errorCode}` : ''
    })`;
  }
}

export class DeviceOffline extends AlexaApiError {
  public readonly message: string;
  public readonly code = 'DeviceOffline';

  constructor() {
    super();
    this.message = `${this.code}(ENDPOINT_UNREACHABLE)`;
  }
}
