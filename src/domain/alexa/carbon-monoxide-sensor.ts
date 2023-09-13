import { CapabilityState } from '.';
import {
  RangeCapabilityAssets,
} from './save-device-capabilities';

export const CarbonMonoxideSensorAssets = ['Alexa.AirQuality.CarbonMonoxide'];

export const isCarbonMonoxideSensor = (
  rangeCapabilities: RangeCapabilityAssets,
  capability: CapabilityState,
) =>
  capability.namespace === 'Alexa.RangeController' &&
  Object.entries(rangeCapabilities).some(
    ([assetId, { instance }]) =>
      instance === capability.instance &&
      CarbonMonoxideSensorAssets.includes(assetId),
  );
