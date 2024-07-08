export const AirQualityQuery = `query getAirQualityStates(
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
        ... on TemperatureSensor {
          value {
            value
            scale
          }
        }
        ... on ToggleState {
          toggleStateValue
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
