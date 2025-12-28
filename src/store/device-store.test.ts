import { randomUUID } from 'crypto';
import * as O from 'fp-ts/Option';
import DeviceStore from './device-store';
import { CapabilityState } from '../domain/alexa';

describe('updateCacheValue', () => {
  test('should update given device and namespace were previously cached', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore(global.createPlatformConfig().performance);
    const existingState: CapabilityState = {
      featureName: 'power',
      value: true,
    };
    store.cache.states = {
      [deviceId]: [O.of(existingState)],
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

  test('should not update given no previous value', () => {
    // given
    const deviceId = randomUUID();
    const store = new DeviceStore(global.createPlatformConfig().performance);
    const existingState: CapabilityState = {
      featureName: 'power',
      value: true,
    };
    store.cache.states = {
      [deviceId]: [O.of(existingState)],
    };

    // when
    const cache = store.updateCacheValue(deviceId, {
      featureName: 'brightness',
      value: 100,
    });

    // then
    expect(cache[deviceId].length).toBe(1);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of(true));
  });
});
