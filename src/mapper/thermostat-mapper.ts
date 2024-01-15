import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';

export const mapAlexaModeToHomeKit = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with('HEAT', constant(characteristic.TargetHeatingCoolingState.HEAT))
    .with('COOL', constant(characteristic.TargetHeatingCoolingState.COOL))
    .with('AUTO', constant(characteristic.TargetHeatingCoolingState.AUTO))
    .otherwise(constant(characteristic.TargetHeatingCoolingState.OFF));

export const mapHomekitModeToAlexa = (
  value: number,
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with(characteristic.TargetHeatingCoolingState.OFF, constant('OFF'))
    .with(characteristic.TargetHeatingCoolingState.HEAT, constant('HEAT'))
    .with(characteristic.TargetHeatingCoolingState.COOL, constant('COOL'))
    .otherwise(constant('AUTO'));
