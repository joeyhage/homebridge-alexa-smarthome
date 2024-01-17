import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import { constVoid, constant, pipe } from 'fp-ts/lib/function';
import { type Characteristic } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import {
  MediaPlayer,
  EchoState,
  isMediaPlaybackValue,
} from '../domain/alexa/echo';
import { Nullable } from '../domain';
import { PlayerInfo } from '../domain/alexa/get-player-info';
import { type MessageCommands } from 'alexa-remote2';

export const mapAlexaPlaybackToHomeKit = (
  state: EchoState['value'],
  mediaState:
    | typeof Characteristic.CurrentMediaState
    | typeof Characteristic.TargetMediaState,
) => {
  if (isMediaPlaybackValue(state)) {
    const { playing, paused, playerId } = pipe(
      state.players,
      A.append(state as MediaPlayer),
      A.reduce(
        {
          playing: false,
          paused: false,
          playerId: undefined as Nullable<string>,
        },
        (acc, cur) => {
          match(cur.state)
            .with('PLAYING', () => {
              acc.playing = true;
              if (!acc.playing) {
                acc.playerId = cur.playerId;
              }
            })
            .with('PAUSED', () => {
              acc.paused = true;
              if (!acc.playerId) {
                acc.playerId = cur.playerId;
              }
            })
            .otherwise(constVoid);
          return acc;
        },
      ),
    );
    return O.of({
      state: playing
        ? mediaState.PLAY
        : paused
        ? mediaState.PAUSE
        : mediaState.STOP,
      playerId,
    });
  } else {
    return O.none;
  }
};

export const mapHomeKitCommandToAlexa = (
  characteristic: typeof Characteristic,
  currentState: NonNullable<PlayerInfo['state']>,
  command: number,
): Option<MessageCommands> =>
  match<[number, NonNullable<PlayerInfo['state']>], Option<MessageCommands>>([
    command,
    currentState,
  ])
    .with(
      [characteristic.RemoteKey.PLAY_PAUSE, 'PAUSED'],
      constant(O.of('play')),
    )
    .with(
      [characteristic.RemoteKey.PLAY_PAUSE, 'PLAYING'],
      constant(O.of('pause')),
    )
    .with(
      [characteristic.RemoteKey.ARROW_LEFT, Pattern._],
      constant(O.of('previous')),
    )
    .with(
      [characteristic.RemoteKey.ARROW_RIGHT, Pattern._],
      constant(O.of('next')),
    )
    .otherwise(constant(O.none));

export const mapHomeKitActiveToAlexa = (
  characteristic: typeof Characteristic,
  command: 0 | 1,
): MessageCommands =>
  match<0 | 1, MessageCommands>(command)
    .with(characteristic.Active.ACTIVE, constant('play'))
    .with(characteristic.Active.INACTIVE, constant('pause'))
    .exhaustive();
