import { CapabilityState } from '.';
import { RangeFeatures } from './save-device-capabilities';

export const CarbonMonoxideRangeFeatures = ['Carbon monoxide'];

export const isCarbonMonoxideSensor = (
  rangeFeatures: RangeFeatures,
  capability: CapabilityState,
) =>
  capability.featureName === 'range' &&
  Object.entries(rangeFeatures).some(
    ([rangeName, { instance }]) =>
      instance === capability.instance &&
      CarbonMonoxideRangeFeatures.includes(rangeName),
  );
