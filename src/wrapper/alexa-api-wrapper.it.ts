/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AlexaRemote, { InitOptions } from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import {
  constFalse,
  constTrue,
  constVoid,
  constant,
  pipe,
} from 'fp-ts/lib/function';
import { PluginLogger } from '../plugin-logger';
import { PLUGIN_NAME } from '../settings';
import { getAuthentication } from '../util';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import { Authentication } from '../domain/alexa';

let alexa: AlexaRemote;
beforeAll(async () => {
  alexa = await getAlexaRemote();
});

it('should retrieve device list', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const devices = await wrapper.getDevices()();

  // then
  expect(
    pipe(
      devices,
      E.map(({ length }) => length > 0),
    ),
  ).toStrictEqual(E.right(true));
});

it('should set lightbulb state', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.setLightbulbState(
    process.env.DEVICE_ID!,
    'turnOff',
  )();

  // then
  expect(result).toStrictEqual(E.right(constVoid()));
});

it('should get lightbulb state', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.getLightbulbState(process.env.DEVICE_ID!)();

  // then
  expect(E.match(constFalse, constTrue)(result)).toStrictEqual(true);
});

async function getAlexaRemote(): Promise<AlexaRemote> {
  const alexaRemote = new AlexaRemote();
  const auth = E.getOrElse(constant({} as Authentication))(
    getAuthentication(`./.${PLUGIN_NAME}`)(),
  );
  return new Promise<AlexaRemote>((resolve, reject) => {
    alexaRemote.init(
      {
        acceptLanguage: 'en-US',
        alexaServiceHost: 'alexa.amazon.com',
        amazonPage: 'amazon.com',
        amazonPageProxyLanguage: 'en_US',
        cookie: auth?.localCookie,
        cookieRefreshInterval: 0,
        formerRegistrationData: auth,
        macDms: auth?.macDms,
        proxyOwnIp: '127.0.0.1',
        proxyPort: 2345,
        useWsMqtt: false,
      } as InitOptions,
      (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(alexaRemote);
      },
    );
  });
}

function getAlexaApiWrapper(alexaRemote: AlexaRemote): AlexaApiWrapper {
  return new AlexaApiWrapper(alexaRemote, console as unknown as PluginLogger);
}
