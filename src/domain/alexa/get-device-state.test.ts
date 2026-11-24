import { extractStates } from './get-device-state';
import { Endpoint } from './get-devices';

type Features = Endpoint['features'];

const feature = (
  partial: Partial<Features[number]> &
    Pick<Features[number], 'name' | 'properties'>,
): Features[number] =>
  ({
    instance: null,
    operations: null,
    configuration: null,
    ...partial,
  } as Features[number]);

describe('extractStates', () => {
  test('extracts valid thermostat mode and setpoints', () => {
    const states = extractStates([
      feature({
        name: 'thermostat',
        properties: [
          {
            name: 'thermostatMode',
            thermostatModeValue: 'OFF',
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
          {
            name: 'targetSetpoint',
            thermostatModeValue: null,
            rangeValue: null,
            value: { value: 23, scale: 'CELSIUS' },
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
    ]);

    expect(states).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          featureName: 'thermostat',
          name: 'thermostatMode',
          value: 'OFF',
        }),
        expect.objectContaining({
          featureName: 'thermostat',
          name: 'targetSetpoint',
          value: { value: 23, scale: 'CELSIUS' },
        }),
      ]),
    );
  });

  test('skips null thermostatModeValue and null setpoints', () => {
    // Fenix / skill thermostats often report null props. Caching those poisoned HAP.
    const states = extractStates([
      feature({
        name: 'thermostat',
        properties: [
          {
            name: 'thermostatMode',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
          {
            name: 'targetSetpoint',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
          {
            name: 'upperSetpoint',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
          {
            name: 'lowerSetpoint',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
    ]);

    expect(states).toEqual([]);
  });

  test('returns empty for null powerStateValue so callers can skip cache update', () => {
    const states = extractStates([
      feature({
        name: 'power',
        properties: [
          {
            name: 'powerState',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
    ]);

    expect(states).toEqual([]);
  });

  test('extracts ON powerStateValue', () => {
    const states = extractStates([
      feature({
        name: 'power',
        properties: [
          {
            name: 'powerState',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: 'ON',
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
    ]);

    expect(states).toEqual([
      expect.objectContaining({
        featureName: 'power',
        value: 'ON',
      }),
    ]);
  });

  test('keeps valid current temperature while skipping null setpoints', () => {
    const states = extractStates([
      feature({
        name: 'temperatureSensor',
        properties: [
          {
            name: 'temperature',
            thermostatModeValue: null,
            rangeValue: null,
            value: { value: 21.5, scale: 'CELSIUS' },
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
      feature({
        name: 'thermostat',
        properties: [
          {
            name: 'targetSetpoint',
            thermostatModeValue: null,
            rangeValue: null,
            value: null,
            toggleStateValue: null,
            powerStateValue: null,
            brightnessStateValue: null,
            colorStateValue: null,
            colorTemperatureInKelvinStateValue: null,
            lockState: null,
          },
        ],
      }),
    ]);

    expect(states).toHaveLength(1);
    expect(states[0]).toEqual(
      expect.objectContaining({
        featureName: 'temperatureSensor',
        value: { value: 21.5, scale: 'CELSIUS' },
      }),
    );
  });
});
