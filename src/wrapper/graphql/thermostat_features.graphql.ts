export const ThermostatQuery = `query getThermostatStates(
  $endpointId: String!
  $latencyTolerance: LatencyToleranceValue
) {
  endpoint(id: $endpointId) {
    features(latencyToleranceValue: $latencyTolerance) {
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
