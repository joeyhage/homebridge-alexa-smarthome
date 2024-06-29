export const SetEndpointFeatures = `mutation updatePowerFeatureForEndpoints($featureControlRequests: [FeatureControlRequest!]!) {
  setEndpointFeatures(
    setEndpointFeaturesInput: {
      featureControlRequests: $featureControlRequests
    }
  ) {
    featureControlResponses {
      endpointId
      featureOperationName
      __typename
    }
    errors {
      endpointId
      code
      __typename
    }
    __typename
  }
}`;
