import { PlatformConfig } from 'homebridge';
import { AmazonDomain } from './alexa/index';

export interface AlexaPlatformConfig extends PlatformConfig {
  platform: 'HomebridgeAlexaSmartHome';
  amazonDomain: AmazonDomain;
  auth: {
    proxy: {
      clientHost: string;
      port: number;
    };
    refreshInterval: number;
  };
  debug?: boolean;
}
