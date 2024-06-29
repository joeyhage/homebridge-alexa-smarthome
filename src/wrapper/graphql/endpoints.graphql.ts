export const EndpointsQuery = `query Endpoints {
  endpoints {
    items {
      id
      friendlyName
      displayCategories {
        primary {
          value
        }
      }
      legacyAppliance {
        capabilities
      }
      serialNumber {
        value {
          text
        }
      }
      enablement
      model {
        value {
          text
        }
      }
      manufacturer {
        value {
          text
        }
      }
      features {
        name
        operations {
          name
        }
      }
    }
  }
}
`;
