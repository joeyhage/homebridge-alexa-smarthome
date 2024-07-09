import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { constant, pipe } from 'fp-ts/lib/function';
import { match } from 'ts-pattern';
import type { AlexaSmartHomePlatform } from '../../platform';
import { generateUuid } from '../../util';
import { HomebridgeAccessoryInfo } from '../homebridge';
import { isCarbonMonoxideSensor } from './carbon-monoxide-sensor';
import { isHumiditySensor } from './humidity-sensor';
import { CapabilityState, SupportedFeatures } from './index';
import { RangeFeatures } from './save-device-capabilities';

export const AirQualityRangeFeatures = ['Indoor air quality'];

export interface AirQualityMonitorState {
  featureName: keyof typeof AirQualityMonitorFeatures &
    keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  instance: CapabilityState['instance'];
}

export const AirQualityMonitorFeatures = {
  range: 'range',
} as const;

export const isAirQualityMonitor = (
  rangeFeatures: RangeFeatures,
  capability: CapabilityState,
) =>
  capability.featureName === 'range' &&
  Object.entries(rangeFeatures).some(
    ([rangeName, { instance }]) =>
      instance === capability.instance &&
      AirQualityRangeFeatures.includes(rangeName),
  );

export const toSupportedHomeKitAccessories = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  deviceName: string,
  capStates: CapabilityState[],
  rangeFeatures: RangeFeatures,
): HomebridgeAccessoryInfo[] =>
  pipe(
    capStates,
    A.filterMap((cap) =>
      match(cap)
        .when(isAirQualityMonitor.bind(undefined, rangeFeatures), () =>
          O.of({
            altDeviceName: O.none,
            deviceType: platform.Service.AirQualitySensor.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              platform.Service.AirQualitySensor.UUID,
            ),
          }),
        )
        .with({ featureName: 'temperatureSensor' }, () =>
          O.of({
            altDeviceName: O.of(`${deviceName} temperature`),
            deviceType: platform.Service.TemperatureSensor.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              platform.Service.TemperatureSensor.UUID,
            ),
          }),
        )
        .when(isHumiditySensor.bind(undefined, rangeFeatures), () =>
          O.of({
            altDeviceName: O.of(`${deviceName} humidity`),
            deviceType: platform.Service.HumiditySensor.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              platform.Service.HumiditySensor.UUID,
            ),
          }),
        )
        .when(isCarbonMonoxideSensor.bind(undefined, rangeFeatures), () =>
          O.of({
            altDeviceName: O.of(`${deviceName} carbon monoxide`),
            deviceType: platform.Service.CarbonMonoxideSensor.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              platform.Service.CarbonMonoxideSensor.UUID,
            ),
          }),
        )
        .otherwise(constant(O.none)),
    ),
  );
