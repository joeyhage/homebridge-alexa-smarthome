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
import { Pattern, isMatching, match } from 'ts-pattern';
import { Authentication } from '../domain/alexa';
import { AlexaDeviceError } from '../domain/alexa/errors';
import type { AlexaPlatformConfig } from '../domain/homebridge';
import {
  IoError,
  JsonFormatError,
  PluginError,
  ValidationError,
} from '../domain/homebridge/errors';
import { AlexaSmartHomePlatform } from '../platform';

const isBetweenIncl = (value: number, min: number, max: number): boolean =>
  value >= min && value <= max;

export const validateConfig = (
  config: PlatformConfig,
): config is AlexaPlatformConfig =>
  match(config)
    .when(
      (c) =>
        isMatching(
          {
            platform: 'HomebridgeAlexaSmartHome',
            devices: Pattern.optional(Pattern.array(Pattern.string)),
            excludeDevices: Pattern.optional(Pattern.array(Pattern.string)),
            amazonDomain: Pattern.optional(Pattern.string),
            language: Pattern.optional(Pattern.string),
            auth: {
              refreshInterval: Pattern.optional(Pattern.number),
              proxy: { clientHost: Pattern.string, port: Pattern.number },
            },
            performance: Pattern.optional({
              cacheTTL: Pattern.optional(Pattern.number),
              backgroundRefresh: Pattern.optional(Pattern.boolean),
            }),
            debug: Pattern.optional(Pattern.boolean),
          },
          c,
        ) &&
        isBetweenIncl(c.auth.proxy.port, 1024, 9999) &&
        isBetweenIncl(c.performance?.cacheTTL ?? 60, 30, 3600),
      constTrue,
    )
    .otherwise(constFalse);

export const isValidAuthentication = (
  maybeCookieData: J.Json | { readonly [key: string]: J.Json | undefined },
): maybeCookieData is Authentication =>
  match(maybeCookieData)
    .with(
      {
        localCookie: Pattern.string,
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
  E.mapLeft((e) => new JsonFormatError('Error converting string to JSON', e)),
);

export const stringifyJson = (json: unknown) =>
  pipe(
    E.tryCatch(() => {
      const s = JSON.stringify(json, undefined, 2);
      if (typeof s !== 'string') {
        throw new Error('Converting unsupported structure to JSON');
      }
      return s;
    }, identity),
    E.mapLeft((e) => new JsonFormatError('Error converting JSON to string', e)),
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

export const round = (value: number, decimals: number) => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

export const isRecord = <T extends string | number | symbol>(
  obj: unknown,
): obj is Record<T, unknown> =>
  !!obj && typeof obj === 'object' && !Array.isArray(obj);

export const generateUuid = (
  platform: AlexaSmartHomePlatform,
  entityId: string,
  deviceType: string,
): string => platform.HAP.uuid.generate(`${entityId}:${deviceType}`);
