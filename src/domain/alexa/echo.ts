import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { constFalse, constTrue, constant, pipe } from 'fp-ts/lib/function';
import { Pattern, match } from 'ts-pattern';
import { AlexaSmartHomePlatform } from '../../platform';
import { generateUuid } from '../../util';
import { HomebridgeAccessoryInfo } from '../homebridge';
import { Nullable } from '../index';
import { CapabilityState, SupportedNamespaces } from './index';

const mediaPlayerPattern = {
  state: Pattern.string,
  shuffle: Pattern.string,
  repeat: Pattern.string,
  supportedOperations: Pattern.union([], Pattern.array(Pattern.string)),
};

export const isMediaPlaybackValue = (
  state: EchoState['value'],
): state is MediaPlayback =>
  match(state)
    .with(
      {
        ...mediaPlayerPattern,
        players: Pattern.union([], Pattern.array(mediaPlayerPattern)),
      },
      constTrue,
    )
    .otherwise(constFalse);

export interface EchoState {
  namespace: keyof typeof EchoNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
}

export const EchoNamespaces = {
  'Alexa.PlaybackStateReporter': 'Alexa.PlaybackStateReporter',
} as const;

export type EchoNamespacesType = keyof typeof EchoNamespaces;

export interface MediaPlayer {
  playerId: Nullable<string>;
  state: string;
  supportedOperations: string[];
  shuffle: string;
  repeat: string;
  media: {
    trackName: string;
    [x: string]: unknown;
  };
  [x: string]: unknown;
}

export interface MediaPlayback extends MediaPlayer {
  players: MediaPlayer[];
}

export const toSupportedHomeKitAccessories = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  deviceName: string,
  capStates: CapabilityState[],
): HomebridgeAccessoryInfo[] =>
  pipe(
    capStates,
    A.filterMap((cap) =>
      match(cap)
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
        .otherwise(constant(O.none)),
    ),
  );