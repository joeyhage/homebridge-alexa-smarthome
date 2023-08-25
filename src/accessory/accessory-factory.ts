import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { PlatformAccessory } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import {
  AlexaDeviceError,
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import BaseAccessory from './base-accessory';
import LightAccessory from './light-accessory';
import OutletAccessory from './outlet-accessory';

export default class AccessoryFactory {
  static createAccessory(
    platform: AlexaSmartHomePlatform,
    accessory: PlatformAccessory,
    device: SmartHomeDevice,
  ): Either<AlexaDeviceError, BaseAccessory> {
    const toAccessory = (): Either<AlexaDeviceError, BaseAccessory> =>
      match(device.providerData.deviceType)
        .with('LIGHT', () =>
          E.of(new LightAccessory(platform, device, accessory)),
        )
        .with('SMARTPLUG', () =>
          E.of(new OutletAccessory(platform, device, accessory)),
        )
        .otherwise(() => E.left(new UnsupportedDeviceError(device)));

    return pipe(
      E.bindTo('acc')(
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
            toAccessory,
          )
          .otherwise((d) => E.left(new InvalidDeviceError(d))),
      ),
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
