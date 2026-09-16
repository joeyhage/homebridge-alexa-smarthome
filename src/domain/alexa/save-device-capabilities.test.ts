/* eslint-disable @typescript-eslint/no-explicit-any */
import { extractRangeFeatures } from './save-device-capabilities';

describe('extractRangeFeatures', () => {
  test('should extract range features keyed by device id and friendly name', () => {
    // given
    const endpoint = {
      id: 'amzn1.alexa.endpoint.12345678-abcd-1234-1234-098765432101',
      friendlyName: 'Air Quality Monitor',
      features: [
        {
          name: 'range',
          instance: '9',
          properties: [
            {
              name: 'rangeValue',
              rangeValue: { value: 75 },
            },
          ],
          configuration: {
            friendlyName: {
              value: {
                text: 'Indoor Air Quality',
              },
            },
          },
        },
      ],
    };
    const device = {
      id: '12345678-abcd-1234-1234-098765432101',
      endpointId: endpoint.id,
      displayName: 'Air Quality Monitor',
      supportedOperations: [],
      enabled: true,
      deviceType: 'AIR_QUALITY_MONITOR',
      serialNumber: 'Unknown',
      model: 'Unknown',
      manufacturer: 'homebridge-alexa-smarthome',
    };

    // when
    const actual = extractRangeFeatures([[endpoint, device]] as any);

    // then
    expect(actual).toStrictEqual({
      '12345678-abcd-1234-1234-098765432101': {
        'Indoor Air Quality': {
          featureName: 'range',
          instance: '9',
          rangeName: 'Indoor Air Quality',
        },
      },
    });
  });

  test('should return an empty object given a device with no range controllers', () => {
    // given
    const endpoint = {
      id: 'amzn1.alexa.endpoint.other',
      friendlyName: 'Light',
      features: [
        {
          name: 'power',
          instance: null,
          properties: [{ name: 'powerState', powerStateValue: 'ON' }],
          configuration: null,
        },
      ],
    };
    const device = {
      id: 'other',
      endpointId: endpoint.id,
      displayName: 'Light',
      supportedOperations: ['turnOn', 'turnOff'],
      enabled: true,
      deviceType: 'LIGHT',
      serialNumber: 'Unknown',
      model: 'Unknown',
      manufacturer: 'homebridge-alexa-smarthome',
    };

    // when
    const actual = extractRangeFeatures([[endpoint, device]] as any);

    // then
    expect(actual).toStrictEqual({});
  });
});
