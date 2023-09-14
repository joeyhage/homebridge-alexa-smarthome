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
import { Authentication } from '../domain/alexa';
import { PLUGIN_NAME } from '../settings';
import { getAuthentication } from '../util';
import { PluginLogger } from '../util/plugin-logger';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import DeviceStore from '../store/device-store';

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
  ).toStrictEqual(E.of(true));
});

it('should set lightbulb state', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.setDeviceState(
    process.env.DEVICE_ID!,
    'turnOff',
  )();

  // then
  expect(result).toStrictEqual(E.of(constVoid()));
});

it('should get device state', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.getDeviceStates([process.env.DEVICE_ID!])();

  // then
  expect(E.match(constFalse, constTrue)(result)).toStrictEqual(true);
});

it('should get player info', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.getPlayerInfo(process.env.DEVICE_NAME!)();

  // then
  expect(E.match(constFalse, constTrue)(result)).toStrictEqual(true);
});

it('should set device volume', async () => {
  // given
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const result = await wrapper.setVolume(process.env.DEVICE_NAME!, 15)();

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
  const log = new PluginLogger(global.MockLogger, global.createPlatformConfig());
  return new AlexaApiWrapper(
    alexaRemote,
    log,
    new DeviceStore(log),
  );
}
