import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { constant, flow } from 'fp-ts/lib/function';
import { Nullable } from '../index';
import { InvalidResponse } from './errors';

export const validateGetDevicesSuccessful = flow(
  O.fromNullable,
  O.match(
    constant(
      E.left(
        new InvalidResponse(
          'No Alexa devices were found for the current Alexa account',
        ),
      ),
    ),
    (devices) =>
      Array.isArray(devices)
        ? E.of(devices)
        : E.left(
          new InvalidResponse(
            'Invalid list of Alexa devices found for the current Alexa account: ' +
                JSON.stringify(devices, undefined, 2),
          ),
        ),
  ),
);

export interface SmartHomeDevice {
  id: string;
  displayName: string;
  description: string;
  supportedOperations: string[];
  providerData: {
    enabled: string;
    categoryType: string;
    deviceType: string;
    dmsDeviceIdentifiers?: Nullable<
      {
        deviceSerialNumber: Nullable<string>;
      }[]
    >;
  };
}

type GetDevicesResponse = Nullable<SmartHomeDevice[]>;
export default GetDevicesResponse;
