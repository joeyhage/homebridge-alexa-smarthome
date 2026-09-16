/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import { constVoid } from 'fp-ts/lib/function';
import * as hapNodeJs from 'hap-nodejs';
import type { Service } from 'homebridge';
import AlexaRemote from 'alexa-remote2';
import { HttpError, InvalidResponse } from '../domain/alexa/errors';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import DeviceStore from '../store/device-store';
import { PluginLogger } from '../util/plugin-logger';
import { AlexaApiWrapper } from './alexa-api-wrapper';

jest.mock('alexa-remote2');

const alexaRemoteMocks = AlexaRemote as jest.MockedClass<typeof AlexaRemote>;

describe('setDeviceState', () => {
  test('should set state successfully', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.executeSmarthomeDeviceAction.mockImplementationOnce(
      (_1, _2, _3, cb) =>
        cb(undefined, {
          controlResponses: [{ code: 'SUCCESS' }],
        } as SetDeviceStateResponse),
    );

    // when
    const actual = wrapper.setDeviceState(randomUUID(), 'turnOff')();

    // then
    await expect(actual).resolves.toStrictEqual(E.of(constVoid()));
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.executeSmarthomeDeviceAction.mockImplementationOnce(
      (_1, _2, _3, cb) => cb(new Error('error for setDeviceState test')),
    );

    // when
    const actual = wrapper.setDeviceState(randomUUID(), 'turnOff')();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new HttpError(
          'Error setting smart home device state. Reason: error for setDeviceState test',
        ),
      ),
    );
  });
});

describe('getDeviceStateGraphQl', () => {
  test('should get power state successfully', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    const device = getSmartHomeDevice();
    mockAlexa.httpsGet.mockImplementationOnce((_noCheck, _path, cb) =>
      (cb as any)(
        undefined,
        {
          data: {
            endpoint: {
              features: [
                {
                  name: 'power',
                  properties: [{ name: 'powerState', powerStateValue: 'ON' }],
                },
              ],
            },
          },
        } as any,
      ),
    );

    // when
    const actual = await wrapper.getDeviceStateGraphQl(
      device,
      getLightbulbService(),
      false,
    )();

    // then
    expect(actual).toStrictEqual(
      E.of([
        false,
        [{ featureName: 'power', name: 'powerState', value: 'ON' }],
      ]),
    );
  });

  test('should get range state with instance and rangeName', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    const device = getSmartHomeDevice();
    mockAlexa.httpsGet.mockImplementationOnce((_noCheck, _path, cb) =>
      (cb as any)(
        undefined,
        {
          data: {
            endpoint: {
              features: [
                {
                  name: 'range',
                  instance: '4',
                  properties: [{ name: 'rangeValue', rangeValue: { value: 68.0 } }],
                  configuration: {
                    friendlyName: { value: { text: 'Filter Life' } },
                  },
                },
              ],
            },
          },
        } as any,
      ),
    );

    // when
    const actual = await wrapper.getDeviceStateGraphQl(
      device,
      getLightbulbService(),
      false,
    )();

    // then
    expect(actual).toStrictEqual(
      E.of([
        false,
        [
          {
            featureName: 'range',
            name: 'rangeValue',
            value: 68.0,
            instance: '4',
            rangeName: 'Filter Life',
          },
        ],
      ]),
    );
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    const device = getSmartHomeDevice();
    mockAlexa.httpsGet.mockImplementationOnce((_noCheck, _path, cb) =>
      (cb as any)(
        new Error('error for getDeviceStateGraphQl test'),
      ),
    );

    // when
    const actual = wrapper.getDeviceStateGraphQl(
      device,
      getLightbulbService(),
      false,
    )();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new HttpError(
          `Error getting smart home device state for ${device.displayName}. Reason: error for getDeviceStateGraphQl test`,
        ),
      ),
    );
  });
});

describe('getDevices', () => {
  test('should return error given empty response', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.httpsGet.mockImplementationOnce((_noCheck, _path, cb) =>
      (cb as any)(undefined, undefined as any),
    );

    // when
    const actual = wrapper.getDevices()();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new InvalidResponse(
          'No Alexa devices were found for the current Alexa account',
        ),
      ),
    );
  });

  test('should return devices given a valid response', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.httpsGet.mockImplementationOnce((_noCheck, _path, cb) =>
      (cb as any)(
        undefined,
        {
          data: {
            endpoints: {
              items: [
                {
                  id: 'amzn1.alexa.endpoint.abc123',
                  friendlyName: 'Test Light',
                  displayCategories: { primary: { value: 'LIGHT' } },
                  serialNumber: { value: { text: 'SN123' } },
                  enablement: 'ENABLED',
                  model: { value: { text: 'Model X' } },
                  manufacturer: { value: { text: 'Acme' } },
                  features: [
                    {
                      name: 'power',
                      instance: null,
                      operations: [{ name: 'turnOn' }, { name: 'turnOff' }],
                      properties: [{ name: 'powerState', powerStateValue: 'ON' }],
                      configuration: null,
                    },
                  ],
                  endpointReports: [],
                },
              ],
            },
          },
        } as any,
      ),
    );

    // when
    const actual = await wrapper.getDevices()();

    // then
    expect(actual).toStrictEqual(
      E.of([
        {
          id: 'abc123',
          endpointId: 'amzn1.alexa.endpoint.abc123',
          displayName: 'Test Light',
          supportedOperations: ['turnOn', 'turnOff'],
          enabled: true,
          deviceType: 'LIGHT',
          serialNumber: 'SN123',
          model: 'Model X',
          manufacturer: 'homebridge-alexa-smarthome',
        },
      ]),
    );
  });
});

function getAlexaApiWrapper(): AlexaApiWrapper {
  const log = new PluginLogger(global.MockLogger, global.createPlatformConfig());
  return new AlexaApiWrapper(
    hapNodeJs.Service,
    new AlexaRemote(),
    log,
    new DeviceStore(),
  );
}

function getMockedAlexaRemote(): jest.Mocked<AlexaRemote> {
  return alexaRemoteMocks.mock.instances[0] as jest.Mocked<AlexaRemote>;
}

function getLightbulbService(): Service {
  return { UUID: hapNodeJs.Service.Lightbulb.UUID } as unknown as Service;
}

function getSmartHomeDevice() {
  return {
    id: 'abc123',
    endpointId: 'amzn1.alexa.endpoint.abc123',
    displayName: 'Test Light',
    supportedOperations: ['turnOn', 'turnOff'],
    enabled: true,
    deviceType: 'LIGHT',
    serialNumber: 'SN123',
    model: 'Model X',
    manufacturer: 'homebridge-alexa-smarthome',
  };
}
