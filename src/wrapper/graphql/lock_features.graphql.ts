export const LockQuery = `query getLockState(
  $endpointId: String!
  $latencyTolerance: LatencyToleranceValue
) {
  endpoint(id: $endpointId) {
    features(latencyToleranceValue: $latencyTolerance) {
      name
      __typename
      properties {
        name
        ... on Lock {
          lockState
        }
      }
    }
    __typename
  }
}`;
