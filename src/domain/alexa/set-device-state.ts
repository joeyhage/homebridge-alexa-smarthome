import * as E from 'fp-ts/Either';
import { constFalse, constTrue } from 'fp-ts/lib/function';
import { match, Pattern } from 'ts-pattern';
import { AlexaApiError, RequestUnsuccessful } from './errors';
import { DeviceResponse } from './index';

export const validateSetStateSuccessful = E.fromPredicate<
  SetDeviceStateResponse,
  AlexaApiError
>(
  (response) =>
    match(response)
      .with(
        {
          controlResponses: Pattern.intersection(
            Pattern.not([]),
            Pattern.array({ code: 'SUCCESS' }),
          ),
        },
        constTrue,
      )
      .otherwise(constFalse),
  (r) =>
    new RequestUnsuccessful(
      `Error setting smart home device state. Response: ${JSON.stringify(r)}`,
      r.errors?.[0]?.code,
    ),
);

export default interface SetDeviceStateResponse {
  controlResponses: DeviceResponse[];
  errors: DeviceResponse[];
}
