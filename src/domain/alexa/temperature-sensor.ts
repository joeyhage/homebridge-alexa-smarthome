import { CapabilityState, SupportedNamespaces } from './index';

export interface TempSensorState {
  namespace: keyof typeof TempSensorNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
  name?: CapabilityState['name'];
}

export const TempSensorNamespaces = {
  'Alexa.TemperatureSensor': 'Alexa.TemperatureSensor',
} as const;

export type TempSensorNamespacesType = keyof typeof TempSensorNamespaces;
