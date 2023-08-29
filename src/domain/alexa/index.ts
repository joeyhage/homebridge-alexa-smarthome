import { InitOptions } from 'alexa-remote2';
import { Nullable } from '../index';

export const SupportedDeviceTypes = ['LIGHT', 'SMARTPLUG'];

export type AmazonDomain =
  | 'amazon.com'
  | 'amazon.ca'
  | 'amazon.de'
  | 'amazon.es'
  | 'amazon.fr'
  | 'amazon.it'
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
  'Alexa.PowerController': 'Alexa.PowerController',
  'Alexa.BrightnessController': 'Alexa.BrightnessController',
} as const;

export type SupportedNamespacesType = keyof typeof SupportedNamespaces;

export const SupportedActions = {
  turnOn: 'turnOn',
  turnOff: 'turnOff',
  setBrightness: 'setBrightness',
} as const;

export type SupportedActionsType = keyof typeof SupportedActions;

export interface CapabilityState {
  namespace: string;
  name?: Nullable<string>;
  value: string | number | boolean;
}
