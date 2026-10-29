import * as E from 'fp-ts/Either';
import { constFalse, constTrue } from 'fp-ts/lib/function';
import { match, Pattern } from 'ts-pattern';
import { AlexaApiError, RequestUnsuccessful } from './errors';
import { DeviceResponse } from './index';
import { Nullable } from '../index';

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
      `Error setting smart home device state. Response: ${JSON.stringify(
        r,
        undefined,
        2,
      )}`,
      r.errors?.[0]?.code,
    ),
);

export default interface SetDeviceStateResponse {
  controlResponses: DeviceResponse[];
  errors: DeviceResponse[];
}

interface GraphQlError {
  code?: Nullable<string>;
  message?: Nullable<string>;
  extensions?: Nullable<{ code?: Nullable<string> }>;
}

export interface SetEndpointFeaturesResponse {
  data?: Nullable<{
    setEndpointFeatures?: Nullable<{
      featureControlResponses?: Nullable<Array<{ endpointId?: string }>>;
      errors?: Nullable<GraphQlError[]>;
    }>;
  }>;
  errors?: Nullable<GraphQlError[]>;
}

/**
 * Amazon's GraphQL endpoint answers HTTP 200 even when it rejects a command;
 * the failure is only in the body (top-level `errors` or per-endpoint
 * `data.setEndpointFeatures.errors`). Without this check a rejected command is
 * treated as success and HomeKit snaps back on the next poll.
 */
export const validateGraphQlSetStateSuccessful = (
  raw: unknown,
): E.Either<AlexaApiError, SetEndpointFeaturesResponse> => {
  let response: SetEndpointFeaturesResponse;
  try {
    response = (
      typeof raw === 'string' ? JSON.parse(raw || '{}') : raw ?? {}
    ) as SetEndpointFeaturesResponse;
  } catch {
    return E.left(
      new RequestUnsuccessful(
        `Error setting smart home device state. Unparseable response: ${String(
          raw,
        ).slice(0, 500)}`,
        null,
      ),
    );
  }
  const result = response.data?.setEndpointFeatures;
  const errors = [...(response.errors ?? []), ...(result?.errors ?? [])];
  // Only fail on an explicit rejection: listed errors, or a result that
  // accepted no requests at all. Unknown shapes pass, so devices that work
  // today are not broken by a response format this code hasn't seen.
  const acceptedNothing =
    Array.isArray(result?.featureControlResponses) &&
    result?.featureControlResponses.length === 0;
  if (errors.length === 0 && !acceptedNothing) {
    return E.right(response);
  }
  const first = errors[0];
  return E.left(
    new RequestUnsuccessful(
      `Error setting smart home device state. Response: ${JSON.stringify(
        response,
      )}`,
      first?.code ?? first?.extensions?.code ?? first?.message ?? null,
    ),
  );
};
