export const LockQuery = `query getLockState(
  $endpointId: String!
) {
  endpoint(id: $endpointId) {
    features {
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
