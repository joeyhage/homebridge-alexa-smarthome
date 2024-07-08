import { CapabilityState, SupportedFeatures } from './index';

export interface SwitchState {
  featureName: keyof typeof SwitchFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
}

export const SwitchFeatures = {
  power: 'power',
  brightness: 'brightness',
} as const;
