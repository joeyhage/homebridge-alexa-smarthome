import { Nullable } from './domain';

export abstract class AlexaApiError {
  public readonly name = 'AlexaApiError';
  abstract message: string;
}

export class InvalidRequest extends AlexaApiError {
  constructor(public readonly message: string) {
    super();
  }
}

export class HttpError extends AlexaApiError {
  constructor(public readonly message: string) {
    super();
  }
}

export class RequestUnsuccessful extends AlexaApiError {
  public readonly message: string;

  constructor(
    errorMessage: string,
    public readonly errorCode: Nullable<string>,
  ) {
    super();
    this.message =
      errorMessage + (errorCode ? `. Error code: ${errorCode}` : '');
  }
}

export class SpotifyDeviceNotFoundError extends Error {
  constructor() {
    super();
    this.name = 'SpotifyDeviceNotFoundError';
  }
}
