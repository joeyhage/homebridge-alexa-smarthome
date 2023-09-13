import { CapabilityState } from './index';

export const isTemperatureValue = (
  state: CapabilityState['value'],
): state is Temperature =>
  typeof state === 'object' && 'value' in state && 'scale' in state;

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
