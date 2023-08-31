import { CapabilityState, SupportedNamespaces } from './index';

export const isThermostatTemperatureValue = (
  state: ThermostatState['value'],
): state is ThermostatTemperature =>
  typeof state === 'object' && 'value' in state && 'scale' in state;

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

export type TemperatureScale =
  | 'fahrenheit'
  | 'celsius'
  | 'FAHRENHEIT'
  | 'CELSIUS';

export interface ThermostatTemperature {
  scale: TemperatureScale;
  value: number;
  [x: string]: number | string;
}
