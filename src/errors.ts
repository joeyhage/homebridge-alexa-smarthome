import { Nullable } from './domain';

export interface AlexaApiError {
  errorMessage: string;
}

export class InvalidRequest implements AlexaApiError {
  constructor(public readonly errorMessage: string) {}
}

export class HttpError implements AlexaApiError {
  constructor(public readonly errorMessage: string) {}
}

export class RequestUnsuccessful implements AlexaApiError {
  public readonly errorMessage: string;

  constructor(
    errorMessage: string,
    public readonly errorCode: Nullable<string>,
  ) {
    this.errorMessage =
      errorMessage + (errorCode ? `. Error code: ${errorCode}` : '');
  }
}

export class SpotifyDeviceNotFoundError extends Error {
  constructor() {
    super();
    this.name = 'SpotifyDeviceNotFoundError';
  }
}
