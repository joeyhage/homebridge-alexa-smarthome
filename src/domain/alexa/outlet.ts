import { CapabilityState, SupportedNamespaces } from './index';

export interface OutletState {
  namespace: keyof typeof OutletNamespaces & keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
}

export const OutletNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
} as const;
