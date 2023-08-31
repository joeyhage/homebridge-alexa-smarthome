import * as O from 'fp-ts/Option';
import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import * as util from '../util';
import { match } from 'ts-pattern';
import {
  TemperatureScale,
  ThermostatState,
  isThermostatTemperatureValue,
} from '../domain/alexa/thermostat';

export const mapAlexaTempToHomeKit = (state: ThermostatState['value']) => {
  if (isThermostatTemperatureValue(state)) {
    return O.of(
      match(state.scale)
        .with('FAHRENHEIT', () => util.round((state.value - 32) / 1.8, 1))
        .otherwise(constant(state.value)),
    );
  } else {
    return O.none;
  }
};

export const mapHomeKitTempToAlexa = (temp: number, units: TemperatureScale) =>
  units.toLowerCase() === 'celsius' ? temp : Math.round(temp * 1.8 + 32);

export const mapAlexaTempUnitsToHomeKit = (
  state: ThermostatState['value'],
  characteristic: typeof Characteristic,
) => {
  if (isThermostatTemperatureValue(state)) {
    return O.of(
      match(state.scale)
        .with(
          'FAHRENHEIT',
          constant(characteristic.TemperatureDisplayUnits.FAHRENHEIT),
        )
        .otherwise(constant(characteristic.TemperatureDisplayUnits.CELSIUS)),
    );
  } else {
    return O.none;
  }
};

export const mapAlexaModeToHomeKit = (
  value: ThermostatState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with('HEAT', constant(characteristic.TargetHeatingCoolingState.HEAT))
    .with('COOL', constant(characteristic.TargetHeatingCoolingState.COOL))
    .with('AUTO', constant(characteristic.TargetHeatingCoolingState.AUTO))
    .otherwise(constant(characteristic.TargetHeatingCoolingState.OFF));
