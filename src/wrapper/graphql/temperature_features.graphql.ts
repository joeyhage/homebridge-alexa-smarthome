export const TempSensorQuery = `query getTemperatureStates(
  $endpointId: String!
  $latencyTolerance: LatencyToleranceValue
) {
  endpoint(id: $endpointId) {
    features(latencyToleranceValue: $latencyTolerance) {
      name
      properties {
        name
        ... on TemperatureSensor {
          value {
            value
            scale
          }
        }
      }
    }
  }
}`;
