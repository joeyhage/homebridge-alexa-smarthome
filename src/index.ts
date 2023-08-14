import { PLATFORM_NAME } from './settings';
import { HomebridgeSpotifySpeakerPlatform } from './platform';

import type { API } from 'homebridge';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeSpotifySpeakerPlatform);
};
