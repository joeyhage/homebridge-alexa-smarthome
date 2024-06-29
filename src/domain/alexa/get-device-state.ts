import * as O from 'fp-ts/Option';
import { constant } from 'fp-ts/lib/function';
import { match } from 'ts-pattern';
import { CapabilityState } from './index';

export const extractStates = (
  deviceStateResponse: EndpointStateResponse,
): CapabilityState[] => {
  return deviceStateResponse.data.endpoint.features
    .map((feature) =>
      match(feature)
        .with({ name: 'power' }, () =>
          O.of({
            namespace: 'Alexa.PowerController',
            value: feature.properties[0].powerStateValue,
          } as CapabilityState),
        )
        .with({ name: 'brightness' }, () =>
          O.of({
            namespace: 'Alexa.BrightnessController',
            value: feature.properties[0].brightnessStateValue,
          } as CapabilityState),
        )
        .otherwise(constant(O.none)),
    )
    .filter(O.isSome)
    .map((_) => _.value);
};

interface EndpointStateResponse {
  data: {
    endpoint: {
      features: Array<{
        name: string;
        properties: Array<{
          type: string;
          name: string;
          accuracy: string;
          __typename: string;
          powerStateValue?: 'ON' | 'OFF';
          brightnessStateValue?: number;
          colorTemperatureInKelvinStateValue?: number;
          colorStateValue?: {
            hue: number;
            saturation: number;
            brightness: number;
          };
        }>;
      }>;
    };
  };
}

export default EndpointStateResponse;
