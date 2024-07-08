import { CapabilityState, SupportedFeatures } from './index';

export interface LockState {
  featureName: keyof typeof LockFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  name?: CapabilityState['name'];
}

export const LockFeatures = {
  lock: 'lock',
} as const;
