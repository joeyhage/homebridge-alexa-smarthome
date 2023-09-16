export abstract class PluginError extends Error {
  constructor(message: string, public readonly name: string, public readonly cause?: unknown) {
    super(message);
    this.message = `${name}(${message})`;
  }
}

export class JsonFormatError extends PluginError {
  constructor(message: string, cause?: unknown) {
    super(message, JsonFormatError.name, cause);
  }
}

export class ValidationError extends PluginError {
  constructor(message: string, cause?: unknown) {
    super(message, ValidationError.name, cause);
  }
}

export class IoError extends PluginError {
  constructor(message: string, cause?: unknown) {
    super(message, IoError.name, cause);
  }
}
