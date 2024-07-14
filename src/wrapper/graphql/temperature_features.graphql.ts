export const TempSensorQuery = `query getTemperatureStates(
  $endpointId: String!
) {
  endpoint(id: $endpointId) {
    features {
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
