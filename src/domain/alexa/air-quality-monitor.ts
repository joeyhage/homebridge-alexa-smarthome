import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { constant, pipe } from 'fp-ts/lib/function';
import { match } from 'ts-pattern';
import type { AlexaSmartHomePlatform } from '../../platform';
import { generateUuid } from '../../util';
import { HomebridgeAccessoryInfo } from '../homebridge';
import { isCarbonMonoxideSensor } from './carbon-monoxide-sensor';
import { isHumiditySensor } from './humidity-sensor';
import { CapabilityState, SupportedNamespaces } from './index';
import { RangeCapabilityAssets } from './save-device-capabilities';

export const AirQualityAssets = ['Alexa.AirQuality.IndoorAirQuality'];

export interface AirQualityMonitorState {
  namespace: keyof typeof AirQualityMonitorNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
  instance: CapabilityState['instance'];
}

export const AirQualityMonitorNamespaces = {
  'Alexa.RangeController': 'Alexa.RangeController',
} as const;

export const isAirQualityMonitor = (
  rangeCapabilities: RangeCapabilityAssets,
  capability: CapabilityState,
) =>
  capability.namespace === 'Alexa.RangeController' &&
  Object.entries(rangeCapabilities).some(
    ([assetId, { instance }]) =>
      instance === capability.instance && AirQualityAssets.includes(assetId),
  );

export const toSupportedHomeKitAccessories = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  deviceName: string,
  capStates: CapabilityState[],
  rangeCapabilities: RangeCapabilityAssets,
): HomebridgeAccessoryInfo[] =>
  pipe(
    capStates,
    A.filterMap((cap) =>
      match(cap)
        .when(isAirQualityMonitor.bind(undefined, rangeCapabilities), () =>
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
        .with({ namespace: 'Alexa.TemperatureSensor' }, () =>
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
        .when(isHumiditySensor.bind(undefined, rangeCapabilities), () =>
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
        .when(isCarbonMonoxideSensor.bind(undefined, rangeCapabilities), () =>
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
