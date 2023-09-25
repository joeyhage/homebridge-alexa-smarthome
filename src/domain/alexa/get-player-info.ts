import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';
import { Nullable } from '../index';
import { AlexaApiError, InvalidResponse } from './errors';

export const validateGetPlayerInfoSuccessful = (
  res: GetPlayerInfoResponse,
): Either<AlexaApiError, PlayerInfo> =>
  pipe(
    res,
    O.fromNullable,
    O.flatMap(({ playerInfo }) => O.fromNullable(playerInfo)),
    O.match(() => {
      return E.left(
        new InvalidResponse(
          'No media player information found. Alexa said: ' +
            JSON.stringify(res, undefined, 2),
        ),
      );
    }, E.of),
  );

export interface PlayerInfo {
  infoText?: Nullable<{
    subText1?: Nullable<string>; // artist
    subText2?: Nullable<string>; // playlist
    title?: Nullable<string>; // song title
  }>;
  progress?: Nullable<{
    allowScrubbing?: Nullable<boolean>;
    mediaLength?: Nullable<number>;
    mediaProgress?: Nullable<number>;
  }>;
  provider?: Nullable<{
    providerDisplayName?: Nullable<string>; // Spotify
    providerName?: Nullable<string>; // Spotify
  }>;
  state?: Nullable<'PLAYING' | 'PAUSED'>;
  transport?: {
    next?: Nullable<'ENABLED' | 'DISABLED'>;
    playPause?: Nullable<'ENABLED' | 'DISABLED'>;
    previous?: Nullable<'ENABLED' | 'DISABLED'>;
    repeat?: Nullable<'SELECTED' | 'DISABLED'>;
    shuffle?: Nullable<'SELECTED' | 'DISABLED'>;
  };
  volume?: Nullable<{
    muted?: Nullable<boolean>;
    volume?: Nullable<number>;
  }>;
}

export default interface GetPlayerInfoResponse {
  playerInfo: Nullable<PlayerInfo>;
}
