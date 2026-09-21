import { CapabilityState, SupportedFeatures } from './index';

export interface AirConditionerState {
  featureName: keyof typeof AirConditionerFeatures &
    keyof typeof SupportedFeatures;
  value: CapabilityState['value'];
  instance?: CapabilityState['instance'];
  name?: CapabilityState['name'];
}

export const AirConditionerFeatures = {
  power: 'power',
  range: 'range',
} as const;

/**
 * Alexa exposes air conditioner temperature through generic range controllers
 * rather than the thermostat interface, so the controls are identified by their
 * friendly name. Names vary by vendor, hence the candidate lists.
 */
export const CurrentTemperatureRangeNames = [
  'Current Room Temperature',
  'Room Temperature',
  'Current Temperature',
  'Indoor Temperature',
] as const;

export const TargetTemperatureRangeNames = [
  'Temperature',
  'Target Temperature',
  'Set Temperature',
] as const;
