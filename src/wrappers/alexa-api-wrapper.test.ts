import AlexaRemote from 'alexa-remote2';
import { randomUUID } from 'crypto';
import * as E from 'fp-ts/Either';
import { constVoid } from 'fp-ts/lib/function';
import { AlexaApiWrapper } from './alexa-api-wrapper';
import SetDeviceStateResponse from '../domain/alexa/set-device-state';
import { HttpError, InvalidRequest, RequestUnsuccessful } from '../errors';

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
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff');

    // then
    expect(actual).toStrictEqual(E.right(constVoid()));
  });

  test('should return error given invalid device id', async () => {
    // given
    const wrapper = getAlexaApiWrapper();

    // when
    const actual = await wrapper.setLightbulbState('invalid', 'turnOff');

    // then
    expect(actual).toStrictEqual(
      E.left(
        new InvalidRequest('id: invalid is not a valid Smart Home device id'),
      ),
    );
  });

  test('should return HttpError given HTTP error', async () => {
    // given
    const wrapper = getAlexaApiWrapper();
    const mockAlexa = getMockedAlexaRemote();
    mockAlexa.executeSmarthomeDeviceAction.mockImplementationOnce(
      (_1, _2, _3, cb) => cb(new Error('error for test')),
    );

    // when
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff');

    // then
    expect(actual).toStrictEqual(
      E.left(
        new HttpError(
          'Error setting smart home device state. Reason: error for test',
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
    const actual = await wrapper.setLightbulbState(randomUUID(), 'turnOff');

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

function getAlexaApiWrapper(): AlexaApiWrapper {
  return new AlexaApiWrapper(new AlexaRemote());
}

function getMockedAlexaRemote(): jest.Mocked<AlexaRemote> {
  return alexaRemoteMocks.mock.instances[0] as jest.Mocked<AlexaRemote>;
}
