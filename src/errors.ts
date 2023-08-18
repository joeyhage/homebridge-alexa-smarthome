import { Nullable } from './domain';

export abstract class AlexaApiError {
  public readonly name = 'AlexaApiError';
  abstract message: string;
}

export class InvalidRequest extends AlexaApiError {
  public readonly message: string;

  constructor(message: string) {
    super();
    this.message = `InvalidRequest(${message})`;
  }
}

export class HttpError extends AlexaApiError {
  public readonly message: string;

  constructor(message: string) {
    super();
    this.message = `HttpError(${message})`;
  }
}

export class RequestUnsuccessful extends AlexaApiError {
  public readonly message: string;

  constructor(message: string, public readonly errorCode: Nullable<string>) {
    super();
    this.message = `RequestUnsuccessful(${message}${errorCode ? `. Error code: ${errorCode}` : ''})`;
  }
}
