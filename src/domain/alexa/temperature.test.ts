import { isTemperatureValue } from './temperature';

describe('isTemperatureValue', () => {
  test('accepts celsius setpoint objects', () => {
    expect(isTemperatureValue({ value: 23, scale: 'CELSIUS' })).toBe(true);
  });

  test('rejects null without throwing', () => {
    // Alexa skill thermostats often return null setpoints. typeof null === 'object'.
    expect(() => isTemperatureValue(null)).not.toThrow();
    expect(isTemperatureValue(null)).toBe(false);
  });

  test('rejects undefined and primitives', () => {
    expect(isTemperatureValue(undefined)).toBe(false);
    expect(isTemperatureValue(21)).toBe(false);
    expect(isTemperatureValue('CELSIUS')).toBe(false);
  });
});
