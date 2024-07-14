export const PowerQuery = `query getPowerState(
  $endpointId: String!
) {
  endpoint(id: $endpointId) {
    features {
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
