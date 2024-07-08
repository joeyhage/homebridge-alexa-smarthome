import { CapabilityState, SupportedFeatures } from './index';

export interface FanState {
  featureName: keyof typeof FanFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
}

export const FanFeatures = {
  power: 'power',
} as const;
