import { InitOptions } from 'alexa-remote2';
import { Nullable } from '../index';

export const SupportedDeviceTypes = [
  'LIGHT',
  'SWITCH',
  'SMARTLOCK',
  'SMARTPLUG',
  'THERMOSTAT',
  'ALEXA_VOICE_ENABLED',
  'AIR_QUALITY_MONITOR',
  'VACUUM_CLEANER',
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
} as const;

export type SupportedNamespacesType = keyof typeof SupportedNamespaces;

export const SupportedActions = {
  lockAction: 'lockAction',
  turnOn: 'turnOn',
  turnOff: 'turnOff',
  setBrightness: 'setBrightness',
  setTargetTemperature: 'setTargetTemperature',
  setThermostatMode: 'setThermostatMode',
} as const;

export type SupportedActionsType = keyof typeof SupportedActions;

export interface CapabilityState {
  namespace: SupportedNamespacesType;
  name?: Nullable<string>;
  value: string | number | boolean | Record<string, unknown>;
  instance?: Nullable<string>;
}
