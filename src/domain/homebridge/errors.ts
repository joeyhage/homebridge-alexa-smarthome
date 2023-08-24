export abstract class PluginError extends Error {
  constructor(message: string, public readonly name: string) {
    super(message);
    this.message = `${name}(${message})`;
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
