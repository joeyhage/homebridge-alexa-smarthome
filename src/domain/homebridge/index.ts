import { PlatformConfig } from 'homebridge';
import { AmazonDomain } from '../alexa/index';

export interface AlexaPlatformConfig extends PlatformConfig {
  platform: 'HomebridgeAlexaSmartHome';
  devices?: string[];
  amazonDomain?: AmazonDomain;
  auth: {
    proxy: {
      clientHost: string;
      port: number;
    };
    refreshInterval?: number;
  };
  language?: string;
  debug?: boolean;
}
