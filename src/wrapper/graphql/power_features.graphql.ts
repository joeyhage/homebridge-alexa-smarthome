export const PowerQuery = `query getPowerState(
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
      }
    }
  }
}`;