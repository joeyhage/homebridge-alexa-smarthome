import { Option } from 'fp-ts/lib/Option';
import { PlatformConfig } from 'homebridge';
import { AmazonDomain } from '../alexa/index';
import { Nullable } from '../index';

export interface HomebridgeAccessoryInfo {
  deviceType: string;
  uuid: string;
  altDeviceName: Option<string>;
}

export interface AlexaPlatformConfig extends PlatformConfig {
  platform: 'HomebridgeAlexaSmartHome';
  devices: Nullable<string[]>;
  excludeDevices: Nullable<string[]>;
  amazonDomain: Nullable<AmazonDomain>;
  language: Nullable<string>;
  auth: {
    proxy: {
      clientHost: string;
      port: number;
    };
    refreshInterval: Nullable<number>;
  };
  performance: Nullable<{
    cacheTTL: Nullable<number>;
    backgroundRefresh: Nullable<boolean>;
  }>;
  debug: Nullable<boolean>;
}
