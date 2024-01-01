import { CapabilityState, SupportedNamespaces } from './index';

export interface FanState {
  namespace: keyof typeof FanNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
}

export const FanNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
} as const;