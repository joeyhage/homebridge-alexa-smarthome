import { constant } from 'fp-ts/lib/function';
import type { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';

export const mapHomeKitPowerToAlexaAction = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match<CapabilityState['value'], SupportedActionsType>(value)
    .with(characteristic.Active.ACTIVE, constant('turnOn'))
    .otherwise(constant('turnOff'));

export const mapHomeKitPowerToAlexaValue = (
  value: CapabilityState['value'],
  characteristic: typeof Characteristic,
) =>
  match(value)
    .with(characteristic.Active.ACTIVE, constant('ON'))
    .otherwise(constant('OFF'));
