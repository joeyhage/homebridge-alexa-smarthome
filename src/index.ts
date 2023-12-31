import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AlexaSmartHomePlatform } from './platform';

import type { API } from 'homebridge';

export = (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, AlexaSmartHomePlatform);
};
