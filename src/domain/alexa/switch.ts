import { CapabilityState, SupportedNamespaces } from './index';

export interface SwitchState {
  namespace: keyof typeof SwitchNamespaces & keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
}

export const SwitchNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
  'Alexa.BrightnessController': 'Alexa.BrightnessController',
} as const;
