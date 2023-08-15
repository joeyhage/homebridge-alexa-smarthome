import { Nullable } from '../index';

export interface SmartHomeDevice {
  id: string;
  friendlyName: string;
  enablement: string;
  displayCategories: {
    primary: {
      value: string;
    };
  };
  features: {
    name: string;
    operations: {
      name: string;
    };
  };
}

export default interface GetDevicesResponse {
  data: Nullable<{
    endpoints: Nullable<{
      items: SmartHomeDevice[];
    }>;
  }>;
  extensions: Nullable<{
    duration: number;
    requestID: string;
  }>;
}
