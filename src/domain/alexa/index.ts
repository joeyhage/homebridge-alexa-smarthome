import { InitOptions } from '../../alexa-remote.js';
import { Nullable } from '../index';

export const SupportedDeviceTypes = [
  'LIGHT',
  'SWITCH',
  'SMARTLOCK',
  'FAN',
  'SMARTPLUG',
  'THERMOSTAT',
  'ALEXA_VOICE_ENABLED',
  'AIR_QUALITY_MONITOR',
  'VACUUM_CLEANER',
  'GAME_CONSOLE',
  'AIR_FRESHENER',
];

export type AmazonDomain =
  | 'amazon.com'
  | 'amazon.ca'
  | 'amazon.de'
  | 'amazon.es'
  | 'amazon.fr'
  | 'amazon.it'
  | 'amazon.in'
  | 'amazon.nl'
  | 'amazon.co.jp'
  | 'amazon.co.uk'
  | 'amazon.com.au'
  | 'amazon.com.br'
  | 'amazon.com.mx';

type FormerRegistrationData = Extract<
  Extract<InitOptions, Partial<object>>['formerRegistrationData'],
  object
>;
export type Authentication = FormerRegistrationData;

export interface DeviceResponse {
  entity: Nullable<{
    entityId: string;
    entityType: string;
  }>;
  entityId: Nullable<string>;
  code: Nullable<string>;
  message: Nullable<string>;
  error: Nullable<string>;
}

export const SupportedNamespaces = {
  'Alexa.LockController': 'Alexa.LockController',
  'Alexa.PowerController': 'Alexa.PowerController',
  'Alexa.BrightnessController': 'Alexa.BrightnessController',
  'Alexa.TemperatureSensor': 'Alexa.TemperatureSensor',
  'Alexa.ThermostatController': 'Alexa.ThermostatController',
  'Alexa.RangeController': 'Alexa.RangeController',
  'Alexa.HumiditySensor': 'Alexa.HumiditySensor',
  'Alexa.ThermostatController.HVAC.Components':
    'Alexa.ThermostatController.HVAC.Components',
} as const;

export type SupportedNamespacesType = keyof typeof SupportedNamespaces;

export const SupportedActions = {
  lock: 'lock',
  unlock: 'unlock',
  turnOn: 'turnOn',
  turnOff: 'turnOff',
  setBrightness: 'setBrightness',
  setTargetSetpoint: 'setTargetSetpoint',
  adjustTargetSetpoint: 'adjustTargetSetpoint',
  setThermostatMode: 'setThermostatMode',
} as const;

export type SupportedActionsType = keyof typeof SupportedActions;

export const SupportedFeatures = {
  brightness: 'brightness',
  color: 'color',
  colorTemperature: 'colorTemperature',
  lock: 'lock',
  power: 'power',
  range: 'range',
  temperatureSensor: 'temperatureSensor',
  thermostat: 'thermostat',
  toggle: 'toggle',
} as const;

export type SupportedFeatures = keyof typeof SupportedFeatures;

export interface CapabilityState {
  featureName: SupportedFeatures;
  value: string | number | boolean | Record<string, unknown>;
  instance?: Nullable<string>;
  name?: Nullable<string>;
  rangeName?: Nullable<string>;
}
