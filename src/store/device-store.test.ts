import { randomUUID } from 'crypto';
import * as O from 'fp-ts/Option';
import DeviceStore from './device-store';

describe('updateCacheValue', () => {
  test('should update given device and feature were previously cached', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore();
    store.cache.states = {
      [deviceId]: [
        O.of({
          featureName: 'power',
          value: true,
        }),
      ],
    };

    // when
    const cache = store.updateCacheValue(deviceId, {
      featureName: 'power',
      value: false,
    });

    // then
    expect(cache[deviceId].length).toBe(1);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of(false));
  });

  test('should add a new entry given no previous value for that feature', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore();
    store.cache.states = {
      [deviceId]: [
        O.of({
          featureName: 'power',
          value: true,
        }),
      ],
    };

    // when
    const cache = store.updateCacheValue(deviceId, {
      featureName: 'brightness',
      value: 100,
    });

    // then
    expect(cache[deviceId].length).toBe(2);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of(true));
    expect(
      O.Functor.map(cache[deviceId][1], ({ value }) => value),
    ).toStrictEqual(O.of(100));
  });
});
