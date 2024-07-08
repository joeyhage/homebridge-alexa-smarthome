export const LightQuery = `query getPowerBrightnessColorColorTempStates(
  $endpointId: String!
  $latencyTolerance: LatencyToleranceValue
) {
  endpoint(id: $endpointId) {
    features(latencyToleranceValue: $latencyTolerance) {
      name
      properties {
        name
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
  }
}
`;
