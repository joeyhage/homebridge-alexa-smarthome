import { CapabilityState, SupportedFeatures } from './index';

export interface TempSensorState {
  featureName: keyof typeof TempSensorFeatures & keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  name?: CapabilityState['name'];
}

export const TempSensorFeatures = {
  temperatureSensor: 'temperatureSensor',
} as const;

export type TempSensorFeaturesType = keyof typeof TempSensorFeatures;
