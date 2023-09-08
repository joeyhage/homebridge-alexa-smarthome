import { Pattern, match } from 'ts-pattern';
import { Nullable } from '../index';
import { CapabilityState, SupportedNamespaces } from './index';
import { constFalse, constTrue } from 'fp-ts/lib/function';

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
