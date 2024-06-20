import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';

export const mapAlexaPositionToHomeKit = (
  value: CapabilityState['value'],
  ds: typeof Characteristic.CurrentDoorState,
) =>
  match(value)
    .when((v) => typeof v === 'number' && v === 0, constant(ds.CLOSED))
    .when((v) => typeof v === 'number' && v > 0, constant(ds.OPEN))
    .otherwise(constant(ds.STOPPED));

export const mapHomeKitPositionToAlexaValue = (
  value: CapabilityState['value'],
  ds: typeof Characteristic.CurrentDoorState,
) =>
  match(value)
    .when(constant(ds.OPEN), constant(100))
    .when(constant(ds.CLOSED), constant(0))
    .otherwise(constant(0));

export const mapAlexaDoorStateToHomeKit = (
  value: CapabilityState['value'],
  ps: typeof Characteristic.PositionState,
) =>
  match(value)
    // todo figure out how to determine opening and closing
    .when((v) => typeof v === 'number' && v === 0, constant(ps.STOPPED))
    .when((v) => typeof v === 'number' && v > 0, constant(ps.STOPPED))
    .otherwise(constant(ps.STOPPED));
