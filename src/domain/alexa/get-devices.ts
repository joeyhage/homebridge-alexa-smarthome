export interface SmartHomeDevice {
  id: string;
  displayName: string;
  description: string;
  supportedOperations: string[];
  providerData: {
    enabled: string;
    categoryType: string;
    deviceType: string;
  };
}

type GetDevicesResponse = SmartHomeDevice[];
export default GetDevicesResponse;
