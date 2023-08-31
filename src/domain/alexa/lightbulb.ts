import { CapabilityState, SupportedNamespaces } from './index';

export interface LightbulbState {
  namespace: keyof typeof LightbulbNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
}

export const LightbulbNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
  'Alexa.BrightnessController': 'Alexa.BrightnessController',
} as const;