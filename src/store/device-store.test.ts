import { randomUUID } from 'crypto';
import * as O from 'fp-ts/Option';
import DeviceStore from './device-store';

describe('updateCacheValue', () => {
  test('should update given device and namespace were previously cached', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore();
    store.cache.states = {
      [deviceId]: [
        O.of({
          namespace: 'Alexa.PowerController',
          value: true,
        }),
      ],
    };

    // when
    const cache = store.updateCacheValue(deviceId, {
      namespace: 'Alexa.PowerController',
      value: false,
    });

    // then
    expect(cache[deviceId].length).toBe(1);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of(false));
  });

  test('should not update given no previous value', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore();
    store.cache.states = {
      [deviceId]: [
        O.of({
          namespace: 'Alexa.PowerController',
          value: true,
        }),
      ],
    };

    // when
    const cache = store.updateCacheValue(deviceId, {
      namespace: 'Alexa.BrightnessController',
      value: 100,
    });

    // then
    expect(cache[deviceId].length).toBe(1);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of(true));
  });
});