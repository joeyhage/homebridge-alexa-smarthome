import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { PlatformAccessory } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { SupportedDeviceTypes } from '../domain/alexa';
import {
  AlexaDeviceError,
  InvalidDeviceError,
  UnsupportedDeviceError,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';

export default class AccessoryFactory {
  static createAccessory(
    platform: AlexaSmartHomePlatform,
    accessory: PlatformAccessory,
    device: SmartHomeDevice,
  ): Either<AlexaDeviceError, BaseAccessory> {
    return pipe(
      E.bindTo('acc')(
        match(device)
          .when(
            ({ providerData: { deviceType } }) =>
              !SupportedDeviceTypes.includes(deviceType),
            (d) => E.left(new UnsupportedDeviceError(d)),
          )
          .with(
            {
              id: Pattern.string,
              providerData: { deviceType: 'LIGHT', categoryType: 'APPLIANCE' },
              displayName: Pattern.string,
              description: Pattern.string,
              supportedOperations: Pattern.array(Pattern.string),
            },
            () =>
              E.of(
                new LightAccessory(platform, platform.log, device, accessory),
              ),
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
