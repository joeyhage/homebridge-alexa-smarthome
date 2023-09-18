import { CapabilityState, SupportedNamespaces } from './index';

export interface LockState {
  namespace: keyof typeof LockNamespaces &
    keyof typeof SupportedNamespaces;
  value: CapabilityState['value'];
  name?: CapabilityState['name'];
}

export const LockNamespaces = {
  'Alexa.LockController': 'Alexa.LockController'
} as const;

export type LockNamespacesType = keyof typeof LockNamespaces;
