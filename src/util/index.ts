import * as E from 'fp-ts/Either';
import * as IOE from 'fp-ts/IOEither';
import { IOEither } from 'fp-ts/IOEither';
import * as J from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import {
  constFalse,
  constTrue,
  constant,
  flow,
  identity,
  pipe,
} from 'fp-ts/lib/function';
import fs from 'fs';
import type { PlatformConfig } from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { Authentication } from '../domain/alexa';
import type { AlexaPlatformConfig } from '../domain/homebridge';
import {
  IoError,
  JsonFormatError,
  PluginError,
  ValidationError,
} from '../domain/homebridge/errors';

export const validateConfig = (
  config: PlatformConfig,
): config is AlexaPlatformConfig =>
  match(config)
    .with(
      {
        platform: 'HomebridgeAlexaSmartHome',
        amazonDomain: Pattern.optional(Pattern.string),
        auth: {
          refreshInterval: Pattern.optional(Pattern.number),
          proxy: { clientHost: Pattern.string, port: Pattern.number },
        },
        language: Pattern.optional(Pattern.string),
        devices: Pattern.optional(Pattern.array(Pattern.string)),
        debug: Pattern.optional(Pattern.boolean),
      },
      constTrue,
    )
    .otherwise(constFalse);

export const isValidAuthentication = (
  maybeCookieData: J.Json,
): maybeCookieData is Authentication =>
  match(maybeCookieData)
    .with(
      {
        localCookie: Pattern.string,
        deviceSerial: Pattern.string,
        deviceId: Pattern.string,
        deviceAppName: Pattern.string,
        refreshToken: Pattern.string,
        macDms: {
          device_private_key: Pattern.string,
          adp_token: Pattern.string,
        },
      },
      constTrue,
    )
    .otherwise(constFalse);

export const readFile = (path: string) =>
  IOE.tryCatch(
    () => fs.readFileSync(path, { encoding: 'utf-8' }),
    (e) => new IoError('Error reading file. ' + e),
  );

export const parseJson = flow(
  J.parse,
  E.mapLeft((e) => new JsonFormatError('Invalid JSON. ' + e)),
);

export const getAuthentication = (
  persistPath: string,
): IOEither<Option<PluginError>, Authentication> => {
  const doesPreviousAuthExist = pipe(
    IOE.tryCatch(
      () => (fs.existsSync(persistPath) ? O.some(true) : O.none),
      (e) =>
        O.some(
          new IoError('Error checking for existing authentication file. ' + e),
        ),
    ),
    IOE.flatMap(IOE.fromOption(constant(O.none))),
  );

  const toCookieData: (json: J.Json) => NonNullable<J.Json> = flow(
    O.fromNullable,
    O.map((j) =>
      match(j)
        .with({ cookieData: Pattern.not(Pattern.nullish) }, (j) => j.cookieData)
        .otherwise(identity),
    ),
    O.getOrElse<NonNullable<J.Json>>(constant({})),
  );

  return pipe(
    doesPreviousAuthExist,
    IOE.flatMap(() => IOE.Bifunctor.mapLeft(readFile(persistPath), O.some)),
    IOE.flatMapEither((s) => E.Bifunctor.mapLeft(parseJson(s), O.some)),
    IOE.map(toCookieData),
    IOE.filterOrElse(
      isValidAuthentication,
      constant(O.some(new ValidationError('Invalid configuration'))),
    ),
  );
};
