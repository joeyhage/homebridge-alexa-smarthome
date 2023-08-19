import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { PlatformAccessory } from 'homebridge';
import { match, Pattern } from 'ts-pattern';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import BaseAccessory from './BaseAccessory';
import LightAccessory from './LightAccessory';

export default class AccessoryFactory {
  static createAccessory(
    platform: AlexaSmartHomePlatform,
    accessory: PlatformAccessory,
    device: SmartHomeDevice,
  ): TaskEither<string, BaseAccessory> {
    return pipe(
      TE.bindTo('acc')(
        match(device)
          .with(
            {
              id: Pattern.string,
              providerData: { deviceType: 'LIGHT', categoryType: 'APPLIANCE' },
              displayName: Pattern.string,
              description: Pattern.string,
              supportedOperations: Pattern.array(Pattern.string),
            },
            () =>
              TE.of(
                new LightAccessory(
                  platform,
                  platform.logger,
                  device,
                  accessory,
                ),
              ),
          )
          .otherwise(() =>
            TE.left(`Unsupported device: ${device.displayName}.`),
          ),
      ),
      TE.tap(({ acc }) => {
        acc.configureServices();
        acc.configureStatusActive();
        acc.setInitialized(true);
        return TE.of(acc);
      }),
      TE.map(({ acc }) => acc),
    );
  }
}
