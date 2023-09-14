/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AlexaRemote, { InitOptions } from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import { constant } from 'fp-ts/lib/function';
import { HomebridgeAPI } from 'homebridge/lib/api';
import { Authentication } from '../domain/alexa';
import { AlexaSmartHomePlatform } from '../platform';
import { PLUGIN_NAME } from '../settings';
import { getAuthentication } from '../util';
import { AlexaApiWrapper } from '../wrapper/alexa-api-wrapper';
import LightAccessory from './light-accessory';
import DeviceStore from '../store/device-store';

let alexa: AlexaRemote;
let spyGetDevices: jest.SpyInstance<any>;
beforeAll(async () => {
  [alexa, spyGetDevices] = await getAlexaRemote();
});

it('should update power state, cache new value on success, and use cached new value for new status', async () => {
  // given
  const acc = createLightAccessory();

  // when
  const powerState = await acc.handlePowerGet();
  await acc.handlePowerSet(!powerState);
  const updatedState = await acc.handlePowerGet();
  await acc.handlePowerSet(powerState);

  // then
  expect(powerState).toBeDefined();
  expect(updatedState).not.toEqual(powerState);
  expect(spyGetDevices).toHaveBeenCalledTimes(1);
});

function createPlatform() {
  const platform = new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    new HomebridgeAPI(),
  );
  (platform as any).deviceStore = new DeviceStore(platform.log);
  (platform as any).alexaApi = new AlexaApiWrapper(
    alexa,
    platform.log,
    platform.deviceStore,
  );
  platform.activeDeviceIds = [process.env.DEVICE_ID!];
  return platform;
}

function createLightAccessory() {
  const device = {
    id: process.env.DEVICE_ID!,
    displayName: 'test light',
    description: 'test',
    supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
    providerData: {
      enabled: true,
      categoryType: 'APPLIANCE',
      deviceType: 'LIGHT',
    },
  };
  const platform = createPlatform();
  const uuid = platform.HAP.uuid.generate(device.id);
  const platAcc = new platform.api.platformAccessory(device.displayName, uuid);
  const acc = new LightAccessory(platform, device, platAcc);
  acc.service = acc.platformAcc.addService(
    acc.Service.Lightbulb,
    acc.device.displayName,
  );
  return acc;
}

async function getAlexaRemote(): Promise<[AlexaRemote, jest.SpyInstance<any>]> {
  const alexaRemote = new AlexaRemote();
  const spyGetDevices = jest.spyOn(alexaRemote, 'querySmarthomeDevices');
  const auth = E.getOrElse(constant({} as Authentication))(
    getAuthentication(`./.${PLUGIN_NAME}`)(),
  );
  return new Promise((resolve, reject) => {
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
        return resolve([alexaRemote, spyGetDevices]);
      },
    );
  });
}
