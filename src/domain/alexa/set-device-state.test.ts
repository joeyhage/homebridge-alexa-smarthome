import * as E from 'fp-ts/Either';
import { validateGraphQlSetStateSuccessful } from './set-device-state';

describe('validateGraphQlSetStateSuccessful', () => {
  test('accepts a normal success response', () => {
    const res = {
      data: {
        setEndpointFeatures: {
          featureControlResponses: [{ endpointId: 'amzn1.x' }],
          errors: [],
        },
      },
    };
    expect(E.isRight(validateGraphQlSetStateSuccessful(res))).toBe(true);
  });

  test('accepts null errors and unknown shapes', () => {
    expect(
      E.isRight(
        validateGraphQlSetStateSuccessful({
          data: { setEndpointFeatures: { errors: null } },
        }),
      ),
    ).toBe(true);
    expect(E.isRight(validateGraphQlSetStateSuccessful({}))).toBe(true);
  });

  test('rejects per-endpoint errors and surfaces the code', () => {
    const res = validateGraphQlSetStateSuccessful({
      data: {
        setEndpointFeatures: {
          featureControlResponses: [],
          errors: [{ endpointId: 'amzn1.x', code: 'TEMPERATURE_OUT_OF_RANGE' }],
        },
      },
    });
    expect(E.isLeft(res)).toBe(true);
    expect(E.isLeft(res) && res.left.message).toContain(
      'Error code: TEMPERATURE_OUT_OF_RANGE',
    );
  });

  test('rejects top-level GraphQL errors', () => {
    const res = validateGraphQlSetStateSuccessful({
      data: null,
      errors: [{ message: 'Validation error', extensions: { code: 'BAD' } }],
    });
    expect(E.isLeft(res) && res.left.message).toContain('Error code: BAD');
  });

  test('rejects a result that accepted nothing', () => {
    const res = validateGraphQlSetStateSuccessful({
      data: {
        setEndpointFeatures: { featureControlResponses: [], errors: [] },
      },
    });
    expect(E.isLeft(res)).toBe(true);
  });
});
