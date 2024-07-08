import * as O from 'fp-ts/Option';
import { constant } from 'fp-ts/lib/function';
import { Pattern, match } from 'ts-pattern';
import { Endpoint } from './get-devices';
import { CapabilityState } from './index';

export const extractStates = (
  deviceFeatures: EndpointStateResponse['data']['endpoint']['features'],
): CapabilityState[] => {
  const withCommonProps = (f: {
    name: string;
    properties: Array<Record<string, unknown>>;
  }) => ({
    featureName: f.name,
    name: f.properties[0].name,
  });
  return deviceFeatures
    .flatMap((f) =>
      !Array.isArray(f.properties) || f.properties.length <= 1
        ? [f]
        : f.properties.map((p) => ({ ...f, properties: [p] })),
    )
    .map((f) =>
      match(f)
        .with(
          {
            name: 'brightness',
            properties: Pattern.array({
              brightnessStateValue: Pattern.number,
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].brightnessStateValue,
            } as CapabilityState),
        )
        .with(
          {
            name: 'color',
            properties: Pattern.array({
              colorStateValue: {
                brightness: Pattern.number,
                hue: Pattern.number,
                saturation: Pattern.number,
              },
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].colorStateValue,
            } as CapabilityState),
        )
        .with(
          {
            name: 'colorTemperature',
            properties: Pattern.array({
              colorTemperatureInKelvinStateValue: Pattern.number,
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].colorTemperatureInKelvinStateValue,
            } as CapabilityState),
        )
        .with(
          {
            name: 'lock',
            properties: Pattern.array({
              lockState: Pattern.string,
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].lockState,
            } as CapabilityState),
        )
        .with(
          {
            name: 'power',
            properties: Pattern.array({
              powerStateValue: Pattern.string,
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].powerStateValue,
            } as CapabilityState),
        )
        .with(
          {
            name: 'toggle',
            properties: Pattern.array({
              toggleStateValue: Pattern.string,
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].toggleStateValue,
            } as CapabilityState),
        )
        .with(
          {
            name: 'temperatureSensor',
            properties: Pattern.array({
              value: {
                value: Pattern.number,
                scale: Pattern.string,
              },
            }),
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].value,
            } as CapabilityState),
        )
        .with(
          {
            name: 'range',
            instance: Pattern.string,
            properties: Pattern.array({
              rangeValue: {
                value: Pattern.number,
              },
            }),
            configuration: {
              friendlyName: {
                value: {
                  text: Pattern.string,
                },
              },
            },
          },
          (_) =>
            O.of({
              ...withCommonProps(_),
              value: _.properties[0].rangeValue.value,
              instance: _.instance,
              rangeName: _.configuration.friendlyName.value.text,
            } as CapabilityState),
        )
        .with(
          {
            name: 'thermostat',
            properties: Pattern.array(Pattern.any),
          },
          (_) =>
            match(_.properties[0].name)
              .with('thermostatMode', () =>
                O.of({
                  ...withCommonProps(_),
                  value: _.properties[0].thermostatModeValue,
                } as CapabilityState),
              )
              .with(
                Pattern.union(
                  'targetSetpoint',
                  'upperSetpoint',
                  'lowerSetpoint',
                ),
                () =>
                  O.of({
                    ...withCommonProps(_),
                    value: _.properties[0].value,
                  } as CapabilityState),
              )
              .otherwise(constant(O.none)),
        )
        .otherwise(constant(O.none)),
    )
    .filter(O.isSome)
    .map((_) => _.value);
};

interface EndpointStateResponse {
  data: {
    endpoint: {
      features: Endpoint['features'];
    };
  };
}

export default EndpointStateResponse;
