export const LightQuery = `query getLightState(
  $endpointId: String!
  $latencyTolerance: LatencyToleranceValue
) {
  endpoint(id: $endpointId) {
    features(latencyToleranceValue: $latencyTolerance) {
      name
      __typename
      properties {
        type
        name
        accuracy
        __typename
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
      }
    }
    __typename
  }
}
`;
