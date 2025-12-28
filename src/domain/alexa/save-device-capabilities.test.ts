import type { Endpoint, SmartHomeDevice } from './get-devices';
import { extractRangeFeatures } from './save-device-capabilities';

describe('extractRangeCapabilities', () => {
  test('should work', () => {
    // given
    const deviceId = '12345678-abcd-1234-1234-098765432101';
    const endpoint: Endpoint = {
      id: `amzn1.alexa.endpoint.${deviceId}`,
      friendlyName: 'Air Quality Monitor',
      displayCategories: {
        primary: {
          value: 'AIR_QUALITY_MONITOR',
        },
      },
      enablement: 'ENABLED',
      serialNumber: {
        value: {
          text: 'test-serial',
        },
      },
      model: {
        value: {
          text: 'test-model',
        },
      },
      manufacturer: null,
      features: [
        {
          name: 'range',
          instance: '9',
          operations: null,
          properties: [
            {
              name: 'rangeValue',
              rangeValue: {
                value: 50,
              },
              value: null,
              toggleStateValue: null,
              powerStateValue: null,
              brightnessStateValue: null,
              colorStateValue: null,
              colorTemperatureInKelvinStateValue: null,
              lockState: null,
              thermostatModeValue: null,
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
      endpointReports: null,
    };
    const device: SmartHomeDevice = {
      id: deviceId,
      endpointId: endpoint.id,
      displayName: endpoint.friendlyName,
      supportedOperations: [],
      enabled: true,
      deviceType: 'AIR_QUALITY_MONITOR',
      serialNumber: 'test-serial',
      model: 'test-model',
      manufacturer: 'test-manufacturer',
    };

    // when
    const actual = extractRangeFeatures([[endpoint, device]]);

    // then
    expect(actual).toStrictEqual({
      [deviceId]: {
        'Indoor Air Quality': {
          featureName: 'range',
          instance: '9',
          rangeName: 'Indoor Air Quality',
        },
      },
    });
  });
});
