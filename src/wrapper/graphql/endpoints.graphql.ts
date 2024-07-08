export const EndpointsQuery = `query Endpoints {
  endpoints {
    items {
      id
      friendlyName
      displayCategories {
        primary {
          value
        }
      }
      serialNumber {
        value {
          text
        }
      }
      enablement
      model {
        value {
          text
        }
      }
      manufacturer {
        value {
          text
        }
      }
      features {
        name
        instance
        operations {
          name
        }
        properties {
          name
          ... on RangeValue {
            rangeValue {
              value
            }
          }
          ... on TemperatureSensor {
            value {
              value
              scale
            }
          }
          ... on ToggleState {
            toggleStateValue
          }
          ... on Power {
            powerStateValue
          }
          ... on Brightness {
            brightnessStateValue
          }
          ... on Color {
            colorStateValue {
              hue
              saturation
              brightness
            }
          }
          ... on ColorTemperature {
            colorTemperatureInKelvinStateValue
          }
          ... on Lock {
            lockState
          }
          ... on Setpoint {
            value {
              value
              scale
            }
          }
          ... on ThermostatMode {
            thermostatModeValue
          }
        }
        configuration {
          ... on RangeConfiguration {
            friendlyName {
              value {
                text
              }
            }
          }
        }
      }
      endpointReports {
        reporter {
          id
          namespace
          skillStage
        }
      }
    }
  }
}`;
