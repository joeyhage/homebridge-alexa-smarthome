import { extractRangeCapabilities } from './save-device-capabilities';

describe('extractRangeCapabilities', () => {
  test('should work', () => {
    // given
    const response = {
      locationDetails: {
        Default_Location: {
          locationId: 'Default_Location',
          amazonBridgeDetails: {
            amazonBridgeDetails: {
              'LambdaBridge_SKILL/redacted': {
                amazonBridgeIdentifier: {
                  amazonBridgeDSN: 'SKILL/redacted',
                  amazonBridgeType: 'LambdaBridge',
                  lambdaBridge: true,
                  amazonBridgeSource: 'SKILL',
                },
              },
              'LambdaBridge_AAA/SonarCloudService': {
                applianceDetails: {
                  applianceDetails: {
                    AAA_SonarCloudService_redacted: {
                      applianceId: 'AAA_SonarCloudService_redacted',
                      manufacturerName: 'Amazon',
                      friendlyDescription: 'Amazon Indoor Air Quality Monitor',
                      friendlyName: 'Air Quality Monitor',
                      friendlyNameModifiedAt: 1642625562924,
                      capabilitiesModifiedAt: 1642626835970,
                      entityId: '12345678-abcd-1234-1234-098765432101',
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [{ name: 'rangeValue' }],
                            proactivelyReported: true,
                            retrievable: true,
                            readOnly: true,
                          },
                          configuration: {
                            supportedRange: {
                              minimumValue: 0.0,
                              maximumValue: 100.0,
                              precision: 1.0,
                            },
                            unitOfMeasure: '',
                            presets: [],
                          },
                          resources: {
                            friendlyNames: [
                              {
                                value: {
                                  assetId: 'Alexa.AirQuality.IndoorAirQuality',
                                },
                                '@type': 'asset',
                              },
                              {
                                value: {
                                  text: 'Indoor Air Quality',
                                  locale: 'en-US',
                                },
                                '@type': 'text',
                              },
                            ],
                          },
                          instance: '9',
                          interfaceName: 'Alexa.RangeController',
                        },
                      ],
                      applianceTypes: ['AIR_QUALITY_MONITOR'],
                      isEnabled: true,
                      aliases: [],
                      applianceKey: '12345678-abcd-1234-1234-098765432101',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // when
    const actual = extractRangeCapabilities(response);

    // then
    expect(actual).toStrictEqual({
      '12345678-abcd-1234-1234-098765432101': {
        'Alexa.AirQuality.IndoorAirQuality': {
          configuration: {
            presets: [],
            supportedRange: {
              maximumValue: 100,
              minimumValue: 0,
              precision: 1,
            },
            unitOfMeasure: '',
          },
          instance: '9',
          interfaceName: 'Alexa.RangeController',
          assetId: 'Alexa.AirQuality.IndoorAirQuality',
        },
      },
    });
  });
});
