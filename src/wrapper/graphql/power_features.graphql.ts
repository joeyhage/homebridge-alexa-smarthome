export const PowerQuery = `query getEndpointState(
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
      }
    }
    __typename
  }
}`;
