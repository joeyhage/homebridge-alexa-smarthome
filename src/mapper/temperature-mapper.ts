import * as O from 'fp-ts/Option';
import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';
import {
  TemperatureScale,
  isTemperatureValue,
} from '../domain/alexa/temperature';
import * as util from '../util';

export const mapAlexaTempToHomeKit = (state: CapabilityState['value']) => {
  if (isTemperatureValue(state)) {
    const value =
      typeof state.value === 'number' ? state.value : parseFloat(state.value);
    return O.of(
      match(state.scale.toLowerCase())
        .with('fahrenheit', () => util.round((value - 32) / 1.8, 1))
        .otherwise(constant(value)),
    );
  } else {
    return O.none;
  }
};

export const mapHomeKitTempToAlexa = (temp: number, units: TemperatureScale) =>
  units.toLowerCase() === 'celsius' ? temp : Math.round(temp * 1.8 + 32);

export const mapAlexaTempUnitsToHomeKit = (
  state: CapabilityState['value'],
  characteristic: typeof Characteristic,
) => {
  if (isTemperatureValue(state)) {
    return O.of(
      match(state.scale.toLowerCase())
        .with(
          'fahrenheit',
          constant(characteristic.TemperatureDisplayUnits.FAHRENHEIT),
        )
        .otherwise(constant(characteristic.TemperatureDisplayUnits.CELSIUS)),
    );
  } else {
    return O.none;
  }
};
