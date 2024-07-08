import { CapabilityState, SupportedFeatures } from './index';

export interface OutletState {
  featureName: keyof typeof OutletFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
}

export const OutletFeatures = {
  power: 'power',
} as const;
