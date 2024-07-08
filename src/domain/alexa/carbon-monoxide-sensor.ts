import { CapabilityState } from '.';
import { RangeCapabilityAssets } from './save-device-capabilities';

export const CarbonMonoxideRangeFeatures = ['Carbon monoxide'];

export const isCarbonMonoxideSensor = (
  rangeCapabilities: RangeCapabilityAssets,
  capability: CapabilityState,
) =>
  capability.featureName === 'range' &&
  Object.entries(rangeCapabilities).some(
    ([configurationName, { instance }]) =>
      instance === capability.instance &&
      CarbonMonoxideRangeFeatures.includes(configurationName),
  );
