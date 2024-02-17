import * as O from 'fp-ts/Option';
import * as hapNodeJs from 'hap-nodejs';
import type { API } from 'homebridge';
import AlexaRemote from './alexa-remote.js';
import { AlexaSmartHomePlatform } from './platform';

it('should initialize', async () => {
  // given
  const platform = getPlatform();

  // when
  const alexaRemote = new Promise<AlexaRemote>((resolve, reject) => {
    platform.initAlexaRemote(
      O.match(() => resolve(platform.alexaRemote), reject),
    );
  });

  // then
  await expect(alexaRemote).resolves.toBeDefined();
});

function getPlatform(): AlexaSmartHomePlatform {
  return new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    getApi(),
  );
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
