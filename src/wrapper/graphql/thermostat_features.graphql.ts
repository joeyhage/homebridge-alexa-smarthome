export const ThermostatQuery = `query getThermostatStates(
  $endpointId: String!
) {
  endpoint(id: $endpointId) {
    features {
      name
      properties {
        name
        ... on RangeValue {
          rangeValue {
            value
          }
        }
        ... on Setpoint {
          value {
            value
            scale
          }
        }
        ... on TemperatureSensor {
          value {
            value
            scale
          }
        }
        ... on ThermostatMode {
          thermostatModeValue
        }
        ... on Power {
          powerStateValue
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
