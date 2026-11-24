import { CapabilityState } from './index';

export const isTemperatureValue = (
  // Runtime Alexa payloads can be null even when CapabilityState forbids it.
  state: CapabilityState['value'] | null | undefined,
): state is Temperature =>
  // typeof null === 'object' in JS. Guard before `in` or HAP read handlers throw
  // "Cannot use 'in' operator to search for 'value' in null" (Fenix / skill nulls).
  state !== null &&
  state !== undefined &&
  typeof state === 'object' &&
  'value' in state &&
  'scale' in state;

export type TemperatureScale =
  | 'fahrenheit'
  | 'celsius'
  | 'FAHRENHEIT'
  | 'CELSIUS';

export interface Temperature {
  scale: TemperatureScale;
  value: number;
  [x: string]: number | string;
}
