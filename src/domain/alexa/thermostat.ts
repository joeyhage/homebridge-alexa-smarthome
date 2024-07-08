import { CapabilityState, SupportedFeatures } from './index';

export interface ThermostatState {
  featureName: keyof typeof ThermostatFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  instance?: CapabilityState['instance'];
  name?: CapabilityState['name'];
}

export const ThermostatFeatures = {
  range: 'range',
  temperatureSensor: 'temperatureSensor',
  thermostat: 'thermostat',
} as const;

export type ThermostatFeaturesType = keyof typeof ThermostatFeatures;
