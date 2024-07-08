import { CapabilityState } from '.';
import { RangeCapabilityAssets } from './save-device-capabilities';

export const HumiditySensorRangeFeatures = ['Indoor humidity'];

export const isHumiditySensor = (
  rangeCapabilities: RangeCapabilityAssets,
  capability: CapabilityState,
) =>
  capability.featureName === 'range' &&
  Object.entries(rangeCapabilities).some(
    ([configurationName, { instance }]) =>
      instance === capability.instance &&
      HumiditySensorRangeFeatures.includes(configurationName),
  );
