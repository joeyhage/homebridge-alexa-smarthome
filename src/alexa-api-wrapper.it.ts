/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AlexaRemote, { InitOptions } from 'alexa-remote2';
import { API, PlatformConfig } from 'homebridge';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import { PLUGIN_NAME } from './platform';
import { PluginLogger } from './plugin-logger';
import { getAuthentication } from './util';

it('should retrieve device list', async () => {
  // given
  const alexa = await getAlexaRemote();
  const wrapper = getAlexaApiWrapper(alexa);

  // when
  const devices = await wrapper.getDevices();

  // then
  expect(devices.data?.endpoints?.items?.length).toBeGreaterThan(0);
});

async function getAlexaRemote(): Promise<AlexaRemote> {
  const alexaRemote = new AlexaRemote();
  const auth = getAuthentication(`./.${PLUGIN_NAME}`);
  return new Promise<AlexaRemote>((resolve, reject) => {
    alexaRemote.init(
      {
        acceptLanguage: 'en-US',
        alexaServiceHost: 'pitangui.amazon.com',
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
  return new AlexaApiWrapper({} as PlatformConfig, {} as API, console as unknown as PluginLogger, alexaRemote);
}
