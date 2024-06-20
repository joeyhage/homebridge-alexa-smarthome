import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';
import { Pattern, match } from 'ts-pattern';
import FanAccessory from '../accessory/fan-accessory';
import LightAccessory from '../accessory/light-accessory';
import LockAccessory from '../accessory/lock-accessory';
import OutletAccessory from '../accessory/outlet-accessory';
import SwitchAccessory from '../accessory/switch-accessory';
import TelevisionAccessory from '../accessory/television-accessory';
import ThermostatAccessory from '../accessory/thermostat-accessory';
import { SupportedActions } from '../domain/alexa';
import * as airQuality from '../domain/alexa/air-quality-monitor';
import * as echo from '../domain/alexa/echo';
import {
  AlexaDeviceError,
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { RangeCapabilityAssets } from '../domain/alexa/save-device-capabilities';
import { HomebridgeAccessoryInfo } from '../domain/homebridge';
import type { AlexaSmartHomePlatform } from '../platform';
import { generateUuid } from '../util';

const ALEXA_DEVICES_AS_SWITCHES = [
  'SWITCH',
  'AIR_FRESHENER',
  'VACUUM_CLEANER',
  'GAME_CONSOLE',
];

export const mapAlexaDeviceToHomeKitAccessoryInfos = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  device: SmartHomeDevice,
): Either<AlexaDeviceError, HomebridgeAccessoryInfo[]> => {
  return pipe(
    validateDevice(device),
    E.bind('rangeCapabilities', () =>
      E.of<AlexaDeviceError, RangeCapabilityAssets>(
        platform.deviceStore.getRangeCapabilitiesForDevice(entityId),
      ),
    ),
    E.flatMap(({ rangeCapabilities }) =>
      determineSupportedHomeKitAccessories(
        platform,
        entityId,
        device,
        rangeCapabilities,
      ),
    ),
  );
};

const validateDevice = (
  device: SmartHomeDevice,
): Either<AlexaDeviceError, SmartHomeDevice> =>
  match(device)
    .with(
      {
        id: Pattern.string,
        providerData: {
          deviceType: Pattern.string,
          categoryType: 'APPLIANCE',
        },
        displayName: Pattern.string,
        description: Pattern.string,
        supportedOperations: Pattern.array(Pattern.string),
      },
      () => E.of(device),
    )
    .otherwise((d) => E.left(new InvalidDeviceError(d)));

const supportsRequiredActions = (required: string[], supported: string[]) => {
  console.log(required);
  console.log(supported);
  return required.every((req) => supported.includes(req));
};

const determineSupportedHomeKitAccessories = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  device: SmartHomeDevice,
  rangeCapabilities: RangeCapabilityAssets,
): Either<AlexaDeviceError, HomebridgeAccessoryInfo[]> => {
  console.log(device.providerData.deviceType);

  return match([device.providerData.deviceType, device.supportedOperations])
    .when(
      ([type]) => type === 'DOOR',
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Door.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'LIGHT' &&
        supportsRequiredActions(LightAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Lightbulb.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'SWITCH' &&
        ops.includes(SupportedActions.setBrightness) &&
        supportsRequiredActions(LightAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Lightbulb.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'SMARTLOCK' &&
        supportsRequiredActions(LockAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.LockMechanism.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'FAN' &&
        supportsRequiredActions(FanAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Fanv2.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'SMARTPLUG' &&
        supportsRequiredActions(OutletAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Outlet.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'THERMOSTAT' &&
        supportsRequiredActions(ThermostatAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Thermostat.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .when(
      ([type, ops]) =>
        type === 'ALEXA_VOICE_ENABLED' &&
        supportsRequiredActions(TelevisionAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Television.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
          ...echo.toSupportedHomeKitAccessories(
            platform,
            entityId,
            device.displayName,
            platform.deviceStore.getCacheStatesForDevice(entityId),
          ),
        ]),
    )
    .with(['AIR_QUALITY_MONITOR', Pattern._], () =>
      E.of(
        airQuality.toSupportedHomeKitAccessories(
          platform,
          entityId,
          device.displayName,
          platform.deviceStore.getCacheStatesForDevice(entityId),
          rangeCapabilities,
        ),
      ),
    )
    .when(
      ([_, ops]) =>
        supportsRequiredActions(SwitchAccessory.requiredOperations, ops),
      () =>
        E.of([
          {
            altDeviceName: O.none,
            deviceType: platform.Service.Switch.UUID,
            uuid: generateUuid(
              platform,
              entityId,
              device.providerData.deviceType,
            ),
          },
        ]),
    )
    .otherwise(() => E.left(new UnsupportedDeviceError(device, 'mapper')));
};
