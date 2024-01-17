import { CapabilityState } from '.';
import { RangeCapabilityAssets } from './save-device-capabilities';

export const HumiditySensorAssets = ['Alexa.AirQuality.Humidity'];

export const isHumiditySensor = (
  rangeCapabilities: RangeCapabilityAssets,
  capability: CapabilityState,
) =>
  capability.namespace === 'Alexa.RangeController' &&
  Object.entries(rangeCapabilities).some(
    ([assetId, { instance }]) =>
      instance === capability.instance &&
      HumiditySensorAssets.includes(assetId),
  );
