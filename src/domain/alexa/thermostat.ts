import { CapabilityState, SupportedNamespaces } from './index';

export interface ThermostatState {
  namespace: keyof typeof ThermostatNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
  name?: CapabilityState['name'];
}

export const ThermostatNamespaces = {
  'Alexa.TemperatureSensor': 'Alexa.TemperatureSensor',
  'Alexa.ThermostatController': 'Alexa.ThermostatController',
} as const;

export type ThermostatNamespacesType = keyof typeof ThermostatNamespaces;