import AlexaRemote from 'alexa-remote2';
import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import { constVoid } from 'fp-ts/lib/function';
import { DeviceResponse } from '../domain/alexa';
import GetDeviceStatesResponse, {
  DeviceStateResponse,
} from '../domain/alexa/get-device-states';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import { HttpError, InvalidRequest, RequestUnsuccessful } from '../errors';
import { PluginLogger } from '../plugin-logger';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import { Logger, PlatformConfig } from 'homebridge';

jest.mock('alexa-remote2');
const alexaRemoteMocks = AlexaRemote as jest.MockedClass<typeof AlexaRemote>;

beforeEach(() => {
  alexaRemoteMocks.mockClear();
});

describe('setLightbulbState', () => {
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
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff')();

    // then
    expect(actual).toStrictEqual(E.right(constVoid()));
  });

  test('should return error given invalid device id', async () => {
    // given
    const wrapper = getAlexaApiWrapper();

    // when
    const actual = await wrapper.setLightbulbState('invalid', 'turnOff')();

    // then
    expect(actual).toStrictEqual(
      E.left(
        new InvalidRequest('id: \'invalid\' is not a valid Smart Home device id'),
      ),
    );
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.executeSmarthomeDeviceAction.mockImplementationOnce(
      (_1, _2, _3, cb) => cb(new Error('error for setLightbulbState test')),
    );

    // when
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff')();

    // then
    expect(actual).toStrictEqual(
      E.left(
        new HttpError(
          'Error setting smart home device state. Reason: error for setLightbulbState test',
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
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff')();

    // then
    expect(actual).toStrictEqual(
      E.left(
        new RequestUnsuccessful(
          'Error setting smart home device state',
          'TestError',
        ),
      ),
    );
  });
});

describe('getLightbulbState', () => {
  test('should get state successfully', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(undefined, {
        deviceStates: [
          {
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
    const actual = await wrapper.getLightbulbState(randomUUID())();

    // then
    expect(actual).toStrictEqual(
      E.right([
        {
          namespace: 'Alexa.PowerController',
          value: 'ON',
        },
      ]),
    );
  });

  test('should return error given invalid device id', async () => {
    // given
    const wrapper = getAlexaApiWrapper();

    // when
    const actual = await wrapper.getLightbulbState('invalid')();

    // then
    expect(actual).toStrictEqual(
      E.left(new InvalidRequest('No valid device ids to retrieve state for')),
    );
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.querySmarthomeDevices.mockImplementationOnce((_1, _2, _3, cb) =>
      cb!(new Error('error for getLightbulbState test')),
    );
    // when
    const actual = await wrapper.getLightbulbState(randomUUID())();

    // then
    expect(actual).toStrictEqual(
      E.left(
        new HttpError(
          'Error getting smart home device state. Reason: error for getLightbulbState test',
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
    const actual = await wrapper.getLightbulbState(randomUUID())();

    // then
    expect(actual).toStrictEqual(
      E.left(
        new RequestUnsuccessful(
          'Error getting smart home device state',
          'TestError',
        ),
      ),
    );
  });
});

function getAlexaApiWrapper(): AlexaApiWrapper {
  return new AlexaApiWrapper(
    new AlexaRemote(),
    new PluginLogger(
      console as Logger,
      { debug: true, platform: '' } as PlatformConfig,
    ),
  );
}

function getMockedAlexaRemote(): jest.Mocked<AlexaRemote> {
  return alexaRemoteMocks.mock.instances[0] as jest.Mocked<AlexaRemote>;
}
