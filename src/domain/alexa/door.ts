import { CapabilityState, SupportedNamespaces } from './index';

export interface DoorState {
  namespace: keyof typeof DoorNamespaces & keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
  instance: CapabilityState['instance'];
}

export const DoorNamespaces = {
  'Alexa.TemperatureSensor': 'Alexa.TemperatureSensor',
  'Alexa.ToggleController': 'Alexa.ToggleController',
  'Alexa.RangeController': 'Alexa.RangeController',
} as const;

export type DoorNamespacesType = keyof typeof DoorNamespaces;
