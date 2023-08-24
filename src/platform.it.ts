import AlexaRemote from 'alexa-remote2';
import * as IO from 'fp-ts/IO';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';
import * as hapNodeJs from 'hap-nodejs';
import type { API, Logger } from 'homebridge';
import type { AlexaPlatformConfig } from './domain/homebridge';
import { AlexaSmartHomePlatform } from './platform';

it('should initialize', async () => {
  // given
  const platform = getPlatform();

  // when
  const alexaRemote = new Promise<AlexaRemote>((resolve, reject) => {
    platform.initAlexaRemote((result) => {
      pipe(
        result,
        IO.map(O.match(() => resolve(platform.alexaRemote), reject)),
      )();
    });
  });

  // then
  await expect(alexaRemote).resolves.toBeDefined();
});

function getPlatform(): AlexaSmartHomePlatform {
  const logger = console as Logger;
  return new AlexaSmartHomePlatform(logger, getPlatformConfig(), getApi());
}

function getApi(): API {
  return {
    hap: {
      Service: hapNodeJs.Service,
      Characteristic: hapNodeJs.Characteristic,
    },
    on: () => ({}),
    user: { persistPath: () => '.' },
  } as unknown as API;
}

function getPlatformConfig(): AlexaPlatformConfig {
  return {
    platform: 'HomebridgeAlexaSmartHome',
    amazonDomain: 'amazon.com',
    devices: [],
    auth: {
      refreshInterval: 0,
      proxy: {
        clientHost: 'localhost',
        port: 2345,
      },
    },
    language: 'en-US',
    debug: true,
  };
}
