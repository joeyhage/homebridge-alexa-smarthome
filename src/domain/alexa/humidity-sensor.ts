import { CapabilityState } from '.';
import { RangeFeatures } from './save-device-capabilities';

export const HumiditySensorRangeFeatures = ['Indoor humidity'];

export const isHumiditySensor = (
  rangeFeatures: RangeFeatures,
  capability: CapabilityState,
) =>
  capability.featureName === 'range' &&
  Object.entries(rangeFeatures).some(
    ([rangeName, { instance }]) =>
      instance === capability.instance &&
      HumiditySensorRangeFeatures.includes(rangeName),
  );
