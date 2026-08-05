export const EndpointStateQuery = `query getEndpointState(
  $endpointId: String!
) {
  endpoint(id: $endpointId) {
    features {
      name
      instance
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
  }
}`;
