import {
  extractEntityIdBySkill,
  extractRangeCapabilities,
} from './save-device-capabilities';

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

describe('extractEntityIdBySkill', () => {
  test('should work', () => {
    // given

    // when
    const actual = extractEntityIdBySkill(skillResponse);

    // then
    // expect(actual).toHaveLength(1);
    expect(actual).toStrictEqual(skillResult);
  });
});

const skillResult = {
  eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9:
    [
      {
        entityId: '2ab03a9b-daab-4344-94fe-c6ac1f03b139',
        friendlyName: 'Alexa App on Mobile',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
      },
      {
        entityId: '0589978a-8f82-4cdb-935f-270f0fee0f23',
        friendlyName: 'Alexa App on Mobile',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
      },
    ],
  'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==':
    [
      {
        entityId: '8a942e16-cc79-41b0-8931-52e6a3fc0e67',
        friendlyName: 'Table Light',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'cf116e25-2d78-4623-9b58-3c042212f7b1',
        friendlyName: 'Front Hall',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: '7f0152b8-1f43-4e0e-ada8-25d8e4c5ee98',
        friendlyName: 'Doorbell Button BME280 Temperature',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: '95e2cbcb-da42-4c2d-ae33-193e2e75b56d',
        friendlyName: 'Washer Working',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'c8ea2eba-bc07-4f66-b3e7-db3cd94093ab',
        friendlyName: 'Water Meter BME280 DewPoint',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'f1554726-afcf-4e93-a5fd-0796bc7decba',
        friendlyName: 'Stereo',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'af9349b1-4995-4617-9248-25aed18ab075',
        friendlyName: 'Bathroom',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'b8f949d3-d7bd-4a6f-951d-aa11d0a5ead5',
        friendlyName: 'Dryer Working',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
      {
        entityId: 'bcc88dc4-e9bb-483d-bd2d-df9fecbc4d32',
        friendlyName: 'Deck',
        identifier:
          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
      },
    ],
};

const skillResponse = {
  locationDetails: {
    Default_Location: {
      locationId: 'Default_Location',
      amazonBridgeDetails: {
        amazonBridgeDetails: {
          'LambdaBridge_SKILL/eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9':
            {
              amazonBridgeIdentifier: {
                amazonBridgeDSN:
                  'SKILL/eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
                amazonBridgeType: 'LambdaBridge',
                lambdaBridge: true,
                amazonBridgeSource: 'SKILL',
              },
              applianceDetails: {
                applianceDetails: {
                  SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_12010ad0959f01017479c4a1352467cb:
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_12010ad0959f01017479c4a1352467cb',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
                      },
                      manufacturerName: 'Amazon',
                      friendlyDescription: 'Alexa App on Mobile',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Alexa App on Mobile',
                      friendlyNameModifiedAt: 1714767486605,
                      capabilitiesModifiedAt: 1714767486605,
                      ipAddress: '',
                      port: '',
                      entityId: '2ab03a9b-daab-4344-94fe-c6ac1f03b139',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714767486605,
                        lastSeenDiscoverySessionId: {
                          value: '38843da9-7b72-4d4f-82d4-eb93b88e205e',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {},
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          type: 'AlexaInterface',
                          version: '3.1',
                          interfaceName: 'Alexa.RemoteVideoPlayer',
                          configurations: {
                            catalogs: [
                              {
                                type: 'VIDEO_INGESTION_IDENTIFIER',
                                sourceId: 'combee',
                              },
                            ],
                            operations: [
                              'SearchAndPlay',
                              'SearchAndDisplayResults',
                            ],
                          },
                          capabilityType: 'AlexaEndpointCapabilityInstance',
                        },
                      ],
                      applianceTypes: ['ALEXA_VOICE_ENABLED'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [
                        {
                          dmsDeviceSerialNumber:
                            '12010ad0959f01017479c4a1352467cb',
                          dmsDeviceTypeId: 'A2IVLV5VM2W81',
                        },
                      ],
                      applianceKey: '0589978a-8f82-4cdb-935f-270f0fee0f23',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_12010ad0959f01017479c4a1352467cb',
                      ],
                    },
                  SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_16DC2F05327346F0954F84469A1985EB:
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_16DC2F05327346F0954F84469A1985EB',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
                      },
                      manufacturerName: 'Amazon',
                      friendlyDescription: 'Alexa App on Mobile',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Alexa App on Mobile',
                      friendlyNameModifiedAt: 1702304667033,
                      capabilitiesModifiedAt: 1702304667033,
                      ipAddress: '',
                      port: '',
                      entityId: '0589978a-8f82-4cdb-935f-270f0fee0f23',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1702304667033,
                        lastSeenDiscoverySessionId: {
                          value: '5e99b0b1-adeb-44e2-a381-a09be4017095',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {},
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          type: 'AlexaInterface',
                          version: '3.1',
                          interfaceName: 'Alexa.RemoteVideoPlayer',
                          configurations: {
                            catalogs: [
                              {
                                type: 'VIDEO_INGESTION_IDENTIFIER',
                                sourceId: 'combee',
                              },
                            ],
                            operations: [
                              'SearchAndPlay',
                              'SearchAndDisplayResults',
                            ],
                          },
                          capabilityType: 'AlexaEndpointCapabilityInstance',
                        },
                      ],
                      applianceTypes: ['ALEXA_VOICE_ENABLED'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [
                        {
                          dmsDeviceSerialNumber:
                            '16DC2F05327346F0954F84469A1985EB',
                          dmsDeviceTypeId: 'A2IVLV5VM2W81',
                        },
                      ],
                      applianceKey: '0589978a-8f82-4cdb-935f-270f0fee0f23',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLjY4NjRlNjEzLWFiZDctNGVhYy05NWMxLWJkZTQyNTM5MjE2ZSIsInN0YWdlIjoibGl2ZSJ9_A1L3Z4NP0ZW15J_16DC2F05327346F0954F84469A1985EB',
                      ],
                    },
                },
              },
            },
          'LambdaBridge_AAA/SonarCloudService': {
            amazonBridgeIdentifier: {
              amazonBridgeDSN: 'AAA/SonarCloudService',
              amazonBridgeType: 'LambdaBridge',
              lambdaBridge: true,
              amazonBridgeSource: 'SONAR',
            },
            applianceDetails: {
              applianceDetails: {
                'AAA_SonarCloudService_434e4237-4b33-4630-4639-40b03426040c': {
                  applianceId:
                    'AAA_SonarCloudService_434e4237-4b33-4630-4639-40b03426040c',
                  endpointTypeId: '',
                  driverIdentity: {
                    namespace: 'AAA',
                    identifier: 'SonarCloudService',
                  },
                  manufacturerName: 'Hewlett-Packard',
                  friendlyDescription: 'Hewlett-Packard smart device',
                  modelName: '',
                  deviceType: '',
                  version: '0',
                  friendlyName: 'HP LaserJet Pro MFP M521dn',
                  friendlyNameModifiedAt: 1702305603688,
                  capabilitiesModifiedAt: 1702305603688,
                  ipAddress: '',
                  port: '',
                  entityId: '6c6ecc6f-020e-4c3a-8593-84f94b8030d2',
                  applianceNetworkState: {
                    reachability: 'REACHABLE',
                    lastSeenAt: 1714831313713,
                    createdAt: 1702305603688,
                    lastSeenDiscoverySessionId: {
                      value: '629a2526-1e00-49c7-9658-04ec36771183',
                    },
                  },
                  tags: {
                    tagNameToValueSetMap: {},
                  },
                  additionalApplianceDetails: {
                    additionalApplianceDetails: {
                      isPrintCompatible: 'true',
                    },
                  },
                  firmwareVersion: '0',
                  actions: [],
                  capabilities: [
                    {
                      capabilityType: 'AVSInterfaceCapability',
                      type: 'AlexaInterface',
                      version: '3',
                      properties: {
                        supported: [
                          {
                            name: 'level',
                          },
                        ],
                        proactivelyReported: true,
                        retrievable: true,
                        readOnly: false,
                      },
                      configuration: {
                        measurement: {
                          '@type': 'Percentage',
                        },
                      },
                      resources: {
                        friendlyNames: [
                          {
                            value: {
                              text: 'black cartridge hp ce255x',
                              locale: 'en-US',
                            },
                            '@type': 'text',
                          },
                        ],
                      },
                      instance: 'Black Cartridge HP CE255X',
                      interfaceName: 'Alexa.InventoryLevelSensor',
                    },
                    {
                      type: 'AlexaInterface',
                      version: '3',
                      properties: {
                        supported: [],
                        proactivelyReported: false,
                        retrievable: false,
                        nonControllable: false,
                      },
                      configuration: {
                        fileFormatsSupported: [
                          'image/urf',
                          'application/pdf',
                          'application/postscript',
                          'application/vnd.hp-PCL',
                          'application/vnd.hp-PCLXL',
                          'application/PCLm',
                          'application/octet-stream',
                        ],
                        compressionModesSupported: ['NONE'],
                        mediaSizesSupported: [
                          'na_letter_8.5x11in',
                          'na_legal_8.5x14in',
                          'na_executive_7.25x10.5in',
                          'na_foolscap_8.5x13in',
                          'iso_a4_210x297mm',
                          'iso_a5_148x210mm',
                          'iso_a6_105x148mm',
                          'jis_b5_182x257mm',
                          'prc_16k-195x270_195x270mm',
                          'prc_16k-184x260_184x260mm',
                          'roc_16k_7.75x10.75in',
                          'jpn_hagaki_100x148mm',
                          'jpn_oufuku_148x200mm',
                          'na_number-10_4.125x9.5in',
                          'na_monarch_3.875x7.5in',
                          'iso_b5_176x250mm',
                          'iso_c5_162x229mm',
                          'iso_dl_110x220mm',
                          'custom_min_3x5in',
                          'custom_max_8.5x14in',
                        ],
                        mediaTypesSupported: [
                          'stationery',
                          'stationery-lightweight',
                          'extraLight',
                          'midweight',
                          'stationery-heavyweight',
                          'extraHeavy',
                          'transparency',
                          'labels',
                          'stationery-letterhead',
                          'envelope',
                          'stationery-preprinted',
                          'stationery-prepunched',
                          'stationery-colored',
                          'stationery-bond',
                          'recycled',
                          'rough',
                        ],
                        colorModeSupported: 'GRAYSCALE',
                        layoutsSupported: [
                          'PORTRAIT',
                          'LANDSCAPE',
                          'REVERSE_LANDSCAPE',
                          'REVERSE_PORTRAIT',
                        ],
                        duplexModesSupported: [
                          'ONE_SIDED',
                          'TWO_SIDED_SHORT_EDGE',
                          'TWO_SIDED_LONG_EDGE',
                        ],
                      },
                      capabilityType: 'AlexaEndpointCapabilityInstance',
                      interfaceName: 'Alexa.PrinterController',
                    },
                  ],
                  applianceTypes: ['PRINTER'],
                  isEnabled: true,
                  aliases: [],
                  connectedVia: "Homebridge's Echo Dot",
                  alexaDeviceIdentifierList: [],
                  applianceKey: '6c6ecc6f-020e-4c3a-8593-84f94b8030d2',
                  identifiers: {},
                  applianceDriverIdentity: {
                    namespace: 'AAA',
                    identifier: 'SonarCloudService',
                  },
                  ipaddress: '',
                  applianceLambdaControlled: true,
                  mergedApplianceIds: [
                    'AAA_SonarCloudService_434e4237-4b33-4630-4639-40b03426040c',
                  ],
                },
              },
            },
          },
          'LambdaBridge_SKILL/eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==':
            {
              amazonBridgeIdentifier: {
                amazonBridgeDSN:
                  'SKILL/eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                amazonBridgeType: 'LambdaBridge',
                lambdaBridge: true,
                amazonBridgeSource: 'SKILL',
              },
              applianceDetails: {
                applianceDetails: {
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzMtaG9tZWJyaWRnZS1TaWduaWZ5IE5ldGhlcmxhbmRzIEIuVi4tVGFibGUgTGlnaHQtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzMtaG9tZWJyaWRnZS1TaWduaWZ5IE5ldGhlcmxhbmRzIEIuVi4tVGFibGUgTGlnaHQtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'Signify Netherlands B.V.',
                      friendlyDescription: 'homebridge Table Light Lightbulb',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Table Light',
                      friendlyNameModifiedAt: 1714827763678,
                      capabilitiesModifiedAt: 1714827763678,
                      ipAddress: '',
                      port: '',
                      entityId: '8a942e16-cc79-41b0-8931-52e6a3fc0e67',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763678,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          TurnOn:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":10,"value":1}',
                          AdjustPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":11}',
                          ReportState:
                            '[{"interface":"Alexa.PowerLevelController","deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":11},{"interface":"Alexa.ColorTemperatureController","deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":13},{"interface":"Alexa.PowerController","deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":10},{"interface":"Alexa.ColorController","deviceID":"AA:BB:CC:DD:EE:FF","hue":{"aid":9,"iid":14},"saturation":{"aid":9,"iid":15},"brightness":{"aid":9,"iid":11},"on":{"aid":9,"iid":10}}]',
                          SetColorTemperature:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":13}',
                          BrightnessTurnOn: 'true',
                          DecreaseColorTemperature:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":13}',
                          SetPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":11}',
                          SetColor:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","hue":{"aid":9,"iid":14},"saturation":{"aid":9,"iid":15},"brightness":{"aid":9,"iid":11},"on":{"aid":9,"iid":10}}',
                          IncreaseColorTemperature:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":13}',
                          TurnOff:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":9,"iid":10,"value":0}',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerState',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerLevel',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerLevelController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'color',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.ColorController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'colorTemperatureInKelvin',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.ColorTemperatureController',
                        },
                      ],
                      applianceTypes: ['LIGHT'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: '8a942e16-cc79-41b0-8931-52e6a3fc0e67',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzMtaG9tZWJyaWRnZS1TaWduaWZ5IE5ldGhlcmxhbmRzIEIuVi4tVGFibGUgTGlnaHQtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLUZyb250IEhhbGwtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLUZyb250IEhhbGwtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'Tasmota',
                      friendlyDescription: 'homebridge Front Hall Lightbulb',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Front Hall',
                      friendlyNameModifiedAt: 1714827763643,
                      capabilitiesModifiedAt: 1714827763643,
                      ipAddress: '',
                      port: '',
                      entityId: 'cf116e25-2d78-4623-9b58-3c042212f7b1',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763643,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          TurnOn:
                            '{"deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":10,"value":1}',
                          AdjustPowerLevel:
                            '{"deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":11}',
                          ReportState:
                            '[{"interface":"Alexa.PowerController","deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":10},{"interface":"Alexa.PowerLevelController","deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":11}]',
                          BrightnessTurnOn: 'true',
                          SetPowerLevel:
                            '{"deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":11}',
                          TurnOff:
                            '{"deviceID":"1C:22:3D:E3:CF:34","aid":14,"iid":10,"value":0}',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerState',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerLevel',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerLevelController',
                        },
                      ],
                      applianceTypes: ['LIGHT'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'cf116e25-2d78-4623-9b58-3c042212f7b1',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLUZyb250IEhhbGwtMDAwMDAwNDMtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLURvb3JiZWxsIEJ1dHRvbiBCTUUyODAgVGVtcGVyYXR1cmUtMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLURvb3JiZWxsIEJ1dHRvbiBCTUUyODAgVGVtcGVyYXR1cmUtMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'Tasmota',
                      friendlyDescription:
                        'homebridge Doorbell Button BME280 Temperature Temperature Sensor',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Doorbell Button BME280 Temperature',
                      friendlyNameModifiedAt: 1714827763641,
                      capabilitiesModifiedAt: 1714827763641,
                      ipAddress: '',
                      port: '',
                      entityId: '7f0152b8-1f43-4e0e-ada8-25d8e4c5ee98',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763641,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          ReportState:
                            '[{"interface":"Alexa.TemperatureSensor","deviceID":"1C:22:3D:E3:CF:34","aid":82,"iid":10}]',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'temperature',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.TemperatureSensor',
                        },
                      ],
                      applianceTypes: ['TEMPERATURE_SENSOR'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: '7f0152b8-1f43-4e0e-ada8-25d8e4c5ee98',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLURvb3JiZWxsIEJ1dHRvbiBCTUUyODAgVGVtcGVyYXR1cmUtMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItV2FzaGVyIFdvcmtpbmctMDAwMDAwODAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItV2FzaGVyIFdvcmtpbmctMDAwMDAwODAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'NRCHKB',
                      friendlyDescription:
                        'Default Model Washer Working Contact Sensor',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Washer Working',
                      friendlyNameModifiedAt: 1714827763666,
                      capabilitiesModifiedAt: 1714827763666,
                      ipAddress: '',
                      port: '',
                      entityId: '95e2cbcb-da42-4c2d-ae33-193e2e75b56d',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763666,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          ReportState:
                            '[{"interface":"Alexa.ContactSensor","deviceID":"AA:BB:CC:DD:EE:FF","aid":37,"iid":12}]',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'detectionState',
                              },
                            ],
                            proactivelyReported: true,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.ContactSensor',
                        },
                      ],
                      applianceTypes: ['CONTACT_SENSOR'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: '95e2cbcb-da42-4c2d-ae33-193e2e75b56d',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItV2FzaGVyIFdvcmtpbmctMDAwMDAwODAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLVdhdGVyIE1ldGVyIEJNRTI4MCBEZXdQb2ludC0wMDAwMDA4QS0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLVdhdGVyIE1ldGVyIEJNRTI4MCBEZXdQb2ludC0wMDAwMDA4QS0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'Tasmota',
                      friendlyDescription:
                        'homebridge Water Meter BME280 DewPoint Temperature Sensor',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Water Meter BME280 DewPoint',
                      friendlyNameModifiedAt: 1714827763642,
                      capabilitiesModifiedAt: 1714827763642,
                      ipAddress: '',
                      port: '',
                      entityId: 'c8ea2eba-bc07-4f66-b3e7-db3cd94093ab',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763642,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          ReportState:
                            '[{"interface":"Alexa.TemperatureSensor","deviceID":"1C:22:3D:E3:CF:34","aid":23,"iid":24}]',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'temperature',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.TemperatureSensor',
                        },
                      ],
                      applianceTypes: ['TEMPERATURE_SENSOR'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'c8ea2eba-bc07-4f66-b3e7-db3cd94093ab',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_MUM6MjI6M0Q6RTM6Q0Y6MzQtaG9tZWJyaWRnZS1UYXNtb3RhLVdhdGVyIE1ldGVyIEJNRTI4MCBEZXdQb2ludC0wMDAwMDA4QS0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_QkM6MjI6M0Q6RTM6Q0Y6NDQtaG9tZWJyaWRnZS1IVFRQLUlSQmxhc3Rlci1TdGVyZW8tMDAwMDAwNDAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_QkM6MjI6M0Q6RTM6Q0Y6NDQtaG9tZWJyaWRnZS1IVFRQLUlSQmxhc3Rlci1TdGVyZW8tMDAwMDAwNDAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'HTTP-IRBlaster',
                      friendlyDescription: 'homebridge Stereo Fan',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Stereo',
                      friendlyNameModifiedAt: 1714827763642,
                      capabilitiesModifiedAt: 1714827763642,
                      ipAddress: '',
                      port: '',
                      entityId: 'f1554726-afcf-4e93-a5fd-0796bc7decba',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763643,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          TurnOn:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":10,"value":1}',
                          AdjustPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":11}',
                          ReportState:
                            '[{"interface":"Alexa.PowerController","deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":10},{"interface":"Alexa.PowerLevelController","deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":11}]',
                          SetPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":11}',
                          TurnOff:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":2,"iid":10,"value":0}',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerState',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerLevel',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerLevelController',
                        },
                      ],
                      applianceTypes: ['FAN'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'f1554726-afcf-4e93-a5fd-0796bc7decba',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_QkM6MjI6M0Q6RTM6Q0Y6NDQtaG9tZWJyaWRnZS1IVFRQLUlSQmxhc3Rlci1TdGVyZW8tMDAwMDAwNDAtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItQmF0aHJvb20tMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItQmF0aHJvb20tMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'NRCHKB',
                      friendlyDescription:
                        'Default Model Bathroom Temperature Sensor',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Bathroom',
                      friendlyNameModifiedAt: 1714827763641,
                      capabilitiesModifiedAt: 1714827763641,
                      ipAddress: '',
                      port: '',
                      entityId: 'af9349b1-4995-4617-9248-25aed18ab075',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763641,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          ReportState:
                            '[{"interface":"Alexa.TemperatureSensor","deviceID":"AA:BB:CC:DD:EE:FF","aid":38,"iid":12}]',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'temperature',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.TemperatureSensor',
                        },
                      ],
                      applianceTypes: ['TEMPERATURE_SENSOR'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'af9349b1-4995-4617-9248-25aed18ab075',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItQmF0aHJvb20tMDAwMDAwOEEtMDAwMC0xMDAwLTgwMDAtMDAyNkJCNzY1Mjkx',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItRHJ5ZXIgV29ya2luZy0wMDAwMDA4MC0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItRHJ5ZXIgV29ya2luZy0wMDAwMDA4MC0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'NRCHKB',
                      friendlyDescription:
                        'Default Model Dryer Working Contact Sensor',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Dryer Working',
                      friendlyNameModifiedAt: 1714827763679,
                      capabilitiesModifiedAt: 1714827763679,
                      ipAddress: '',
                      port: '',
                      entityId: 'b8f949d3-d7bd-4a6f-951d-aa11d0a5ead5',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763679,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          ReportState:
                            '[{"interface":"Alexa.ContactSensor","deviceID":"AA:BB:CC:DD:EE:FF","aid":36,"iid":12}]',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'detectionState',
                              },
                            ],
                            proactivelyReported: true,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.ContactSensor',
                        },
                      ],
                      applianceTypes: ['CONTACT_SENSOR'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'b8f949d3-d7bd-4a6f-951d-aa11d0a5ead5',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Njk6NjI6Qjc6QUU6Mzg6RDQtRGVmYXVsdCBNb2RlbC1OUkNIS0ItRHJ5ZXIgV29ya2luZy0wMDAwMDA4MC0wMDAwLTEwMDAtODAwMC0wMDI2QkI3NjUyOTE=',
                      ],
                    },
                  'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzgtaG9tZWJyaWRnZS15YW1haGEtaG9tZS1EZWNrLTAwMDAwMDQwLTAwMDAtMTAwMC04MDAwLTAwMjZCQjc2NTI5MQ==':
                    {
                      applianceId:
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzgtaG9tZWJyaWRnZS15YW1haGEtaG9tZS1EZWNrLTAwMDAwMDQwLTAwMDAtMTAwMC04MDAwLTAwMjZCQjc2NTI5MQ==',
                      endpointTypeId: '',
                      driverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      manufacturerName: 'yamaha-home',
                      friendlyDescription: 'homebridge Deck Fan',
                      modelName: '',
                      deviceType: 'CLOUD_DISCOVERED_DEVICE',
                      version: '0',
                      friendlyName: 'Deck',
                      friendlyNameModifiedAt: 1714827763675,
                      capabilitiesModifiedAt: 1714827763675,
                      ipAddress: '',
                      port: '',
                      entityId: 'bcc88dc4-e9bb-483d-bd2d-df9fecbc4d32',
                      applianceNetworkState: {
                        reachability: 'REACHABLE',
                        lastSeenAt: 1714831313713,
                        createdAt: 1714827763675,
                        lastSeenDiscoverySessionId: {
                          value: '629a2526-1e00-49c7-9658-04ec36771183',
                        },
                      },
                      tags: {
                        tagNameToValueSetMap: {},
                      },
                      additionalApplianceDetails: {
                        additionalApplianceDetails: {
                          TurnOn:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":10,"value":1}',
                          AdjustPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":11}',
                          ReportState:
                            '[{"interface":"Alexa.PowerLevelController","deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":11},{"interface":"Alexa.PowerController","deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":10}]',
                          SetPowerLevel:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":11}',
                          TurnOff:
                            '{"deviceID":"AA:BB:CC:DD:EE:FF","aid":27,"iid":10,"value":0}',
                        },
                      },
                      firmwareVersion: '0',
                      actions: [],
                      capabilities: [
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          interfaceName: 'Alexa',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerState',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerController',
                        },
                        {
                          capabilityType: 'AVSInterfaceCapability',
                          type: 'AlexaInterface',
                          version: '3',
                          properties: {
                            supported: [
                              {
                                name: 'powerLevel',
                              },
                            ],
                            proactivelyReported: false,
                            retrievable: true,
                            readOnly: false,
                          },
                          interfaceName: 'Alexa.PowerLevelController',
                        },
                      ],
                      applianceTypes: ['FAN'],
                      isEnabled: true,
                      aliases: [],
                      connectedVia: '',
                      alexaDeviceIdentifierList: [],
                      applianceKey: 'bcc88dc4-e9bb-483d-bd2d-df9fecbc4d32',
                      identifiers: {
                        networkInterfaceIdentifiers: [],
                      },
                      applianceDriverIdentity: {
                        namespace: 'SKILL',
                        identifier:
                          'eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==',
                      },
                      ipaddress: '',
                      applianceLambdaControlled: true,
                      mergedApplianceIds: [
                        'SKILL_eyJza2lsbElkIjoiYW16bjEuYXNrLnNraWxsLmEyOGM0M2UxLWNiYTYtNGFhYy05M2NhLTUwOWU4YzdjZTM5YiIsInN0YWdlIjoiZGV2ZWxvcG1lbnQifQ==_Q0M6MjI6M0Q6RTM6Q0Y6MzgtaG9tZWJyaWRnZS15YW1haGEtaG9tZS1EZWNrLTAwMDAwMDQwLTAwMDAtMTAwMC04MDAwLTAwMjZCQjc2NTI5MQ==',
                      ],
                    },
                },
              },
            },
          'LambdaBridge_AlexaBridge/G090LF11742501NW@A3S5BH2HU6VAYF': {
            amazonBridgeIdentifier: {
              amazonBridgeDSN: 'AlexaBridge/G090LF11742501NW@A3S5BH2HU6VAYF',
              amazonBridgeType: 'LambdaBridge',
              lambdaBridge: true,
              amazonBridgeSource: 'UNKNOWN',
            },
            applianceDetails: {
              applianceDetails: {
                'AlexaBridge_G090LF11742501NW@A3S5BH2HU6VAYF_A3S5BH2HU6VAYF@G090LF11742501NW':
                  {
                    applianceId:
                      'AlexaBridge_G090LF11742501NW@A3S5BH2HU6VAYF_A3S5BH2HU6VAYF@G090LF11742501NW',
                    endpointTypeId: '',
                    driverIdentity: {
                      namespace: 'AlexaBridge',
                      identifier: 'G090LF11742501NW@A3S5BH2HU6VAYF',
                    },
                    manufacturerName: 'amazon',
                    friendlyDescription: 'Amazon Alexa',
                    modelName: '',
                    deviceType: '',
                    version: '0',
                    friendlyName: "Homebridge's Echo Dot",
                    friendlyNameModifiedAt: 1702302728383,
                    capabilitiesModifiedAt: 1702302728383,
                    ipAddress: '',
                    port: '',
                    entityId: 'ef3ea1e3-1261-413a-846c-514b1fbeeb83',
                    applianceNetworkState: {
                      reachability: 'REACHABLE',
                      lastSeenAt: 1714831313713,
                      createdAt: 1702302728383,
                      lastSeenDiscoverySessionId: {
                        value: '0a5e773d-507e-4351-b841-6a6269a23c22',
                      },
                    },
                    tags: {
                      tagNameToValueSetMap: {},
                    },
                    additionalApplianceDetails: {
                      additionalApplianceDetails: {},
                    },
                    firmwareVersion: '0',
                    actions: [],
                    capabilities: [
                      {
                        capabilityType: 'AVSInterfaceCapability',
                        type: 'AlexaInterface',
                        version: '3',
                        properties: {
                          supported: [
                            {
                              name: 'overallMode',
                            },
                            {
                              name: 'babyCryDetectionState',
                            },
                            {
                              name: 'carbonMonoxideSirenDetectionState',
                            },
                            {
                              name: 'snoreDetectionState',
                            },
                            {
                              name: 'waterSoundsDetectionState',
                            },
                            {
                              name: 'smokeAlarmDetectionState',
                            },
                            {
                              name: 'glassBreakDetectionState',
                            },
                            {
                              name: 'detectionModes',
                            },
                            {
                              name: 'runningWaterDetectionState',
                            },
                            {
                              name: 'coughDetectionState',
                            },
                            {
                              name: 'dogBarkDetectionState',
                            },
                            {
                              name: 'humanPresenceDetectionState',
                            },
                            {
                              name: 'smokeSirenDetectionState',
                            },
                            {
                              name: 'beepingApplianceDetectionState',
                            },
                          ],
                          proactivelyReported: true,
                          retrievable: true,
                          readOnly: false,
                        },
                        configuration: {},
                        interfaceName: 'Alexa.AcousticEventSensor',
                      },
                      {
                        capabilityType: 'AVSInterfaceCapability',
                        type: 'AlexaInterface',
                        version: '1.0',
                        interfaceName:
                          'Alexa.FrustrationFreeRegistration.Provisioning',
                      },
                      {
                        properties: {
                          supported: [
                            {
                              name: 'proactiveDetection',
                            },
                          ],
                          proactivelyReported: false,
                          retrievable: false,
                        },
                        type: 'AlexaInterface',
                        version: '1.0',
                        capabilityType: 'AlexaEndpointCapabilityInstance',
                        interfaceName: 'Alexa.EndpointDetector',
                      },
                      {
                        type: 'AlexaInterface',
                        version: '1.0',
                        instance: 'SampleApp.Server',
                        properties: {
                          supported: [
                            {
                              name: 'serviceData',
                            },
                            {
                              name: 'serviceEndpoints',
                            },
                          ],
                          proactivelyReported: true,
                          retrievable: false,
                        },
                        capabilityType: 'AlexaEndpointCapabilityInstance',
                        interfaceName: 'Alexa.LocalService',
                      },
                      {
                        type: 'AlexaInterface',
                        version: '3.1',
                        properties: {
                          supported: [
                            {
                              name: 'enablement',
                            },
                            {
                              name: 'illuminance',
                            },
                          ],
                          proactivelyReported: true,
                          retrievable: true,
                        },
                        capabilityType: 'AlexaEndpointCapabilityInstance',
                        interfaceName: 'Alexa.LightSensor',
                      },
                      {
                        type: 'AlexaInterface',
                        version: '1.0',
                        instance: 'AlexaHybridEngine.Server',
                        properties: {
                          supported: [
                            {
                              name: 'serviceData',
                            },
                            {
                              name: 'serviceEndpoints',
                            },
                          ],
                          proactivelyReported: true,
                          retrievable: false,
                        },
                        capabilityType: 'AlexaEndpointCapabilityInstance',
                        interfaceName: 'Alexa.LocalService',
                      },
                      {
                        type: 'AlexaInterface',
                        version: '1.0',
                        properties: {
                          supported: [
                            {
                              name: 'networkInterfaces',
                            },
                          ],
                          proactivelyReported: true,
                          retrievable: true,
                        },
                        capabilityType: 'AlexaEndpointCapabilityInstance',
                        interfaceName: 'Alexa.EndpointConnectivity',
                      },
                    ],
                    applianceTypes: ['ALEXA_VOICE_ENABLED'],
                    isEnabled: true,
                    aliases: [],
                    connectedVia: '',
                    alexaDeviceIdentifierList: [
                      {
                        dmsDeviceSerialNumber: 'G090LF11742501NW',
                        dmsDeviceTypeId: 'A3S5BH2HU6VAYF',
                      },
                    ],
                    applianceKey: 'ef3ea1e3-1261-413a-846c-514b1fbeeb83',
                    identifiers: {
                      networkInterfaceIdentifiers: [],
                    },
                    applianceDriverIdentity: {
                      namespace: 'AlexaBridge',
                      identifier: 'G090LF11742501NW@A3S5BH2HU6VAYF',
                    },
                    ipaddress: '',
                    applianceLambdaControlled: true,
                    mergedApplianceIds: [
                      'AAA_SonarCloudService_b3205730-f747-3639-8588-6c4992fdb0d2',
                      'AlexaBridge_G090LF11742501NW@A3S5BH2HU6VAYF_G090LF11742501NW',
                      'AlexaBridge_G090LF11742501NW@A3S5BH2HU6VAYF_A3S5BH2HU6VAYF@G090LF11742501NW',
                    ],
                  },
              },
            },
          },
        },
      },
      applianceGroups: {
        applianceGroups: {
          'amzn1.HomeAutomation.ApplianceGroup.A1L3Z4NP0ZW15J.2a35a308-2407-41e6-9019-d0dc029c2519':
            {
              applianceGroupName: 'Bedroom',
              applianceGroupIdentifier: {
                value:
                  'amzn1.HomeAutomation.ApplianceGroup.A1L3Z4NP0ZW15J.2a35a308-2407-41e6-9019-d0dc029c2519',
              },
              spaceTypes: [],
              children: [],
              alexaEndpoints: [],
              defaults: [],
              isSpace: false,
              defaultTypes: {
                audio: {
                  defaultSelectedBy: 'SYSTEM',
                  defaultManagedBy: 'AUTOMATIC_GROUP_MRMG_SYNC_PROCESS',
                  processingStatus: 'NO_AUTOMATIC_SELECTION_POSSIBLE',
                  lastUpdated: '1703013082354',
                },
              },
              space: false,
            },
        },
      },
    },
  },
};
