import { CapabilityState, SupportedFeatures } from './index';

export interface LightbulbState {
  featureName: keyof typeof LightbulbFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
}

export const LightbulbFeatures = {
  power: 'power',
  brightness: 'brightness',
  color: 'color',
  colorTemperature: 'colorTemperature',
} as const;
