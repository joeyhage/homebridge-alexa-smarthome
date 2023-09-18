import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { PlatformAccessory } from 'homebridge';
import { match } from 'ts-pattern';
import {
  AlexaDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import AirQualityAccessory from './air-quality-accessory';
import BaseAccessory from './base-accessory';
import CarbonMonoxideAccessory from './co-accessory';
import HumidityAccessory from './humidity-accessory';
import LightAccessory from './light-accessory';
import LockAccessory from './lock-accessory';
import OutletAccessory from './outlet-accessory';
import SwitchAccessory from './switch-accessory';
import TelevisionAccessory from './television-accessory';
import TemperatureAccessory from './temperature-accessory';
import ThermostatAccessory from './thermostat-accessory';

export default class AccessoryFactory {
  static createAccessory(
    platform: AlexaSmartHomePlatform,
    platAcc: PlatformAccessory,
    device: SmartHomeDevice,
    homeKitDeviceType: string,
  ): Either<AlexaDeviceError, BaseAccessory> {
    const toAccessory = (): Either<AlexaDeviceError, BaseAccessory> =>
      match(homeKitDeviceType)
        .with(platform.Service.Lightbulb.UUID, () =>
          E.of(new LightAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.Switch.UUID, () =>
          E.of(new SwitchAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.LockMechanism.UUID, () =>
          E.of(new LockAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.Outlet.UUID, () =>
          E.of(new OutletAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.Thermostat.UUID, () =>
          E.of(new ThermostatAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.Television.UUID, () =>
          E.of(new TelevisionAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.AirQualitySensor.UUID, () =>
          E.of(new AirQualityAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.CarbonMonoxideSensor.UUID, () =>
          E.of(new CarbonMonoxideAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.HumiditySensor.UUID, () =>
          E.of(new HumidityAccessory(platform, device, platAcc)),
        )
        .with(platform.Service.TemperatureSensor.UUID, () =>
          E.of(new TemperatureAccessory(platform, device, platAcc)),
        )
        .otherwise(() => E.left(new UnsupportedDeviceError(device)));

    return pipe(
      E.bindTo('acc')(toAccessory()),
      E.tap(({ acc }) => {
        acc.configureServices();
        acc.configureStatusActive();
        acc.setInitialized(true);
        return E.of(acc);
      }),
      E.map(({ acc }) => acc),
    );
  }
}
