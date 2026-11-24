import { randomUUID } from 'crypto';
import * as O from 'fp-ts/Option';
import DeviceStore from './device-store';

describe('mergeCacheStates', () => {
  test('merges partial thermostat updates without wiping last-known setpoints', () => {
    const deviceId = randomUUID();
    const store = new DeviceStore({ cacheTTL: 30 });
    store.mergeCacheStates(deviceId, [
      {
        featureName: 'thermostat',
        name: 'targetSetpoint',
        value: { value: 23, scale: 'CELSIUS' },
      },
      {
        featureName: 'thermostat',
        name: 'thermostatMode',
        value: 'OFF',
      },
    ]);

    // Live poll returns only mode (setpoint omitted / was null and filtered out).
    const merged = store.mergeCacheStates(deviceId, [
      {
        featureName: 'thermostat',
        name: 'thermostatMode',
        value: 'HEAT',
      },
    ]);

    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'thermostatMode',
          value: 'HEAT',
        }),
        expect.objectContaining({
          name: 'targetSetpoint',
          value: { value: 23, scale: 'CELSIUS' },
        }),
      ]),
    );
  });

  test('empty incoming leaves existing cache untouched', () => {
    const deviceId = randomUUID();
    const store = new DeviceStore({ cacheTTL: 30 });
    store.mergeCacheStates(deviceId, [
      {
        featureName: 'thermostat',
        name: 'thermostatMode',
        value: 'OFF',
      },
    ]);

    expect(store.mergeCacheStates(deviceId, [])).toEqual([
      expect.objectContaining({ name: 'thermostatMode', value: 'OFF' }),
    ]);
  });
});

describe('updateCacheValue', () => {
  test('updates an existing feature value', () => {
    const deviceId = randomUUID();
    const store = new DeviceStore({ cacheTTL: 30 });
    store.cache.states = {
      [deviceId]: [
        O.of({
          featureName: 'power',
          value: 'ON',
        }),
      ],
    };

    const cache = store.updateCacheValue(deviceId, {
      featureName: 'power',
      value: 'OFF',
    });

    expect(cache[deviceId].length).toBe(1);
    expect(
      O.Functor.map(cache[deviceId][0], ({ value }) => value),
    ).toStrictEqual(O.of('OFF'));
  });

  test('inserts when the feature was not previously cached', () => {
    const deviceId = randomUUID();
    const store = new DeviceStore({ cacheTTL: 30 });
    store.cache.states = {
      [deviceId]: [
        O.of({
          featureName: 'power',
          value: 'ON',
        }),
      ],
    };

    const cache = store.updateCacheValue(deviceId, {
      featureName: 'thermostat',
      name: 'targetSetpoint',
      value: { value: 21, scale: 'CELSIUS' },
    });

    expect(cache[deviceId].length).toBe(2);
  });
});
