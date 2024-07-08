import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { constant, flow, pipe } from 'fp-ts/lib/function';
import * as settings from '../../settings';
import * as util from '../../util/index';
import { Nullable } from '../index';
import { AlexaApiError, InvalidResponse } from './errors';

export const validateGetDevicesSuccessful: (
  res: GetDevicesGraphQlResponse,
) => Either<AlexaApiError, [Endpoint, SmartHomeDevice][]> = flow(
  O.fromNullable,
  O.flatMap(({ data }) => (util.isRecord<string>(data) ? O.of(data) : O.none)),
  O.flatMap(({ endpoints }) =>
    util.isRecord<string>(endpoints) ? O.of(endpoints) : O.none,
  ),
  O.flatMap(({ items }) => (Array.isArray(items) ? O.of(items) : O.none)),
  O.match(
    constant(
      E.left(
        new InvalidResponse(
          'No Alexa devices were found for the current Alexa account',
        ),
      ),
    ),
    (endpoints) =>
      Array.isArray(endpoints)
        ? E.of(
            pipe(
              endpoints,
              A.filter((e) => !!e.displayCategories?.primary?.value),
              A.map((e) => [
                e,
                {
                  endpointId: e.id,
                  id: e.id.replace('amzn1.alexa.endpoint.', ''),
                  displayName: e.friendlyName,
                  supportedOperations: e.features.flatMap(
                    (f) => f.operations?.map((o) => o.name) ?? [],
                  ),
                  enabled: e.enablement === 'ENABLED',
                  deviceType: e.displayCategories!.primary.value,
                  serialNumber: e.serialNumber?.value.text ?? 'Unknown',
                  model: e.model?.value.text ?? 'Unknown',
                  manufacturer: settings.PLUGIN_NAME,
                },
              ]),
            ),
          )
        : E.left(
            new InvalidResponse(
              'Invalid list of Alexa devices found for the current Alexa account: ' +
                JSON.stringify(endpoints, undefined, 2),
            ),
          ),
  ),
);

export interface SmartHomeDevice {
  id: string;
  endpointId: string;
  displayName: string;
  supportedOperations: string[];
  enabled: boolean;
  deviceType: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
}

export interface RangeCapability {
  featureName: Nullable<string>;
  instance: Nullable<string>;
  configurationName: Nullable<string>;
}

export interface Endpoint {
  id: string;
  friendlyName: string;
  displayCategories: Nullable<{
    primary: {
      value: string;
    };
  }>;
  serialNumber: Nullable<{
    value: {
      text: string;
    };
  }>;
  enablement: 'ENABLED' | 'DISABLED';
  model: Nullable<{
    value: {
      text: string;
    };
  }>;
  manufacturer: Nullable<{
    value: {
      text: string;
    };
  }>;
  features: Array<{
    name: string;
    instance: Nullable<string>;
    operations: Nullable<
      Array<{
        name: string;
      }>
    >;
    properties: Array<{
      name: string;
      rangeValue: Nullable<{
        value: number;
      }>;
      value: Nullable<{
        value: number;
        scale: 'CELSIUS' | 'FAHRENHEIT' | 'KELVIN';
      }>;
      toggleStateValue: Nullable<'ON' | 'OFF'>;
      powerStateValue: Nullable<'ON' | 'OFF'>;
      brightnessStateValue: Nullable<number>;
      colorStateValue: Nullable<{
        hue: number;
        saturation: number;
        brightness: number;
      }>;
      colorTemperatureInKelvinStateValue: Nullable<number>;
      lockState: Nullable<'LOCKED' | 'UNLOCKED' | 'JAMMED'>;
      thermostatModeValue: Nullable<'HEAT' | 'COOL' | 'AUTO' | 'ECO' | 'OFF'>;
    }>;
    configuration: Nullable<{
      friendlyName: {
        value: {
          text: string;
        };
      };
    }>;
  }>;
  endpointReports: Nullable<
    Array<{
      reporter: {
        id: string;
        namespace: string;
        skillStage: string;
      };
    }>
  >;
}

export interface GetDevicesGraphQlResponse {
  data: Nullable<{
    endpoints: Nullable<{
      items: Nullable<Endpoint[]>;
    }>;
  }>;
}
