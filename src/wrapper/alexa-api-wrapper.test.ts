import AlexaRemote from 'alexa-remote2';
import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { constVoid } from 'fp-ts/lib/function';
import { DeviceResponse } from '../domain/alexa';
import {
  HttpError,
  InvalidResponse,
  RequestUnsuccessful,
} from '../domain/alexa/errors';
import GetDeviceStatesResponse, {
  DeviceStateResponse,
} from '../domain/alexa/get-device-states';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import { PluginLogger } from '../util/plugin-logger';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import GetDevicesResponse from '../domain/alexa/get-devices';
import DeviceStore from '../store/device-store';

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

  test('should return RequestUnsuccessful given error code in response', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.executeSmarthomeDeviceAction.mockImplementationOnce(
      (_1, _2, _3, cb) =>
        cb(undefined, {
          errors: [{ code: 'TestError' }],
        } as SetDeviceStateResponse),
    );

    // when
    const actual = wrapper.setDeviceState(randomUUID(), 'turnOff')();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new RequestUnsuccessful(
          `Error setting smart home device state. Response: ${JSON.stringify(
            {
              errors: [{ code: 'TestError' }],
            },
            undefined,
            2,
          )}`,
          'TestError',
        ),
      ),
    );
  });
});

describe('getDeviceStates', () => {
  test('should get state successfully', async () => {
    // given
    const deviceId = randomUUID();
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(undefined, {
        deviceStates: [
          {
            entity: {
              entityId: deviceId,
            },
            capabilityStates: [
              JSON.stringify({
                namespace: 'Alexa.PowerController',
                name: 'test',
                value: 'ON',
              }),
            ],
          },
        ],
        errors: Array<DeviceResponse>(),
      } as GetDeviceStatesResponse),
    );

    // when
    const actual = await wrapper.getDeviceStates([deviceId])();

    // then
    expect(actual).toStrictEqual(
      E.of({
        fromCache: false,
        statesByDevice: {
          [deviceId]: [
            O.of({
              namespace: 'Alexa.PowerController',
              name: 'test',
              value: 'ON',
            }),
          ],
        },
      }),
    );
  });

  test('should get device state instance', async () => {
    // given
    const deviceId = randomUUID();
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(undefined, {
        deviceStates: [
          {
            entity: {
              entityId: deviceId,
            },
            capabilityStates: [
              JSON.stringify({
                namespace: 'Alexa.RangeController',
                name: 'rangeValue',
                value: 68.0,
                instance: '4',
              }),
            ],
          },
        ],
        errors: Array<DeviceResponse>(),
      } as GetDeviceStatesResponse),
    );

    // when
    const actual = await wrapper.getDeviceStates([deviceId])();

    // then
    expect(actual).toStrictEqual(
      E.of({
        fromCache: false,
        statesByDevice: {
          [deviceId]: [
            O.of({
              namespace: 'Alexa.RangeController',
              name: 'rangeValue',
              value: 68.0,
              instance: '4',
            }),
          ],
        },
      }),
    );
  });

  test('should use cache once cache is populated', async () => {
    // given
    const deviceId1 = randomUUID();
    const deviceId2 = randomUUID();
    const cs1 = {
      namespace: 'Alexa.PowerController',
      name: 'test 1',
      value: 'ON',
    };
    const cs2 = {
      namespace: 'Alexa.PowerController',
      name: 'test 2',
      value: 'OFF',
    };
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(undefined, {
        deviceStates: [
          {
            entity: {
              entityId: deviceId1,
            },
            capabilityStates: [JSON.stringify(cs1)],
          },
          {
            entity: {
              entityId: deviceId2,
            },
            capabilityStates: [JSON.stringify(cs2)],
          },
        ],
        errors: Array<DeviceResponse>(),
      }),
    );

    // when
    const actual1 = await wrapper.getDeviceStates([deviceId1, deviceId2])();
    const actual2 = await wrapper.getDeviceStates([deviceId1, deviceId2])();

    // then
    const expectedStates = {
      [deviceId1]: [O.of(cs1)],
      [deviceId2]: [O.of(cs2)],
    };
    expect(actual1).toStrictEqual(
      E.of({ statesByDevice: expectedStates, fromCache: false }),
    );
    expect(actual2).toStrictEqual(
      E.of({ statesByDevice: expectedStates, fromCache: true }),
    );
    expect(mockAlexa.querySmarthomeDevices).toHaveBeenCalledTimes(1);
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(new Error('error for getDeviceStates test')),
    );
    // when
    const actual = wrapper.getDeviceStates([randomUUID()])();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new HttpError(
          'Error getting smart home device state. Reason: error for getDeviceStates test',
        ),
      ),
    );
  });

  test('should return RequestUnsuccessful given error code in response', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(undefined, {
        deviceStates: Array<DeviceStateResponse>(),
        errors: [{ code: 'TestError' }],
      } as GetDeviceStatesResponse),
    );

    // when
    const actual = wrapper.getDeviceStates([randomUUID()])();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new RequestUnsuccessful(
          `Error getting smart home device state. Response: ${JSON.stringify(
            {
              deviceStates: [],
              errors: [{ code: 'TestError' }],
            },
            undefined,
            2,
          )}`,
          'TestError',
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
    mockAlexa.getSmarthomeEntities.mockImplementationOnce((cb) =>
      cb(undefined, undefined as GetDevicesResponse),
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

  test('should return error given invalid response', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.getSmarthomeEntities.mockImplementationOnce((cb) =>
      cb(undefined, 'some error' as unknown as GetDevicesResponse),
    );

    // when
    const actual = wrapper.getDevices()();

    // then
    await expect(actual).resolves.toStrictEqual(
      E.left(
        new InvalidResponse(
          'Invalid list of Alexa devices found for the current Alexa account: "some error"',
        ),
      ),
    );
  });
});

function getAlexaApiWrapper(): AlexaApiWrapper {
  const log = new PluginLogger(global.MockLogger, global.createPlatformConfig());
  return new AlexaApiWrapper(
    new AlexaRemote(),
    log,
    new DeviceStore(log),
  );
}

function getMockedAlexaRemote(): jest.Mocked<AlexaRemote> {
  return alexaRemoteMocks.mock.instances[0] as jest.Mocked<AlexaRemote>;
}
