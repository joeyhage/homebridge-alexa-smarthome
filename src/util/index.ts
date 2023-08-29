import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
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
import { AlexaDeviceError } from '../domain/alexa/errors';
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
      () => (fs.existsSync(persistPath) ? O.of(true) : O.none),
      (e) =>
        O.of(
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
    IOE.flatMap(() => IOE.Bifunctor.mapLeft(readFile(persistPath), O.of)),
    IOE.flatMapEither((s) => E.Bifunctor.mapLeft(parseJson(s), O.of)),
    IOE.map(toCookieData),
    IOE.filterOrElse(
      isValidAuthentication,
      constant(O.of(new ValidationError('Invalid configuration'))),
    ),
  );
};

const ENTITY_ID_REGEX = new RegExp(
  /[\da-fA-F]{8}-(?:[\da-fA-F]{4}-){3}[\da-fA-F]{12}/,
);

export const extractEntityId = (id: string): Either<AlexaDeviceError, string> =>
  pipe(
    E.bindTo('matches')(E.of(id.match(ENTITY_ID_REGEX))),
    E.filterOrElse(
      ({ matches }) => !!matches,
      constant(
        new ValidationError(`id: '${id}' is not a valid Smart Home device id`),
      ),
    ),
    E.map(({ matches }) => matches![0]),
  );
