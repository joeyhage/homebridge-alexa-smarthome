import AlexaRemote, { CallbackWithError, InitOptions } from 'alexa-remote2';
import fs from 'fs';
import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { Nullable } from './domain';
import { AlexaPlatformConfig } from './domain/homebridge';
import { PluginLogger } from './plugin-logger';
import * as util from './util';

export const PLATFORM_NAME = 'HomebridgeAlexaSmartHome';
export const PLUGIN_NAME = 'homebridge-alexa-smarthome';

export class AlexaSmartHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly logger: PluginLogger;
  public readonly config: AlexaPlatformConfig;

  public readonly alexaRemote: AlexaRemote;

  public readonly accessories: {
    [uuid: string]: PlatformAccessory;
  } = {};

  private readonly persistPath: string;

  constructor(readonly log: Logger, config: PlatformConfig, public readonly api: API) {
    this.logger = new PluginLogger(log, config);

    if (util.validateConfig(config)) {
      this.config = config;
    } else {
      this.logger.error('Missing configuration for this plugin to work, see the documentation for initial setup.');
      return;
    }

    this.persistPath = `${api.user.persistPath()}/.${PLUGIN_NAME}`;
    this.alexaRemote = new AlexaRemote();

    api.on('didFinishLaunching', async () => {
      this.logger.debug('Executed didFinishLaunching callback');
      this.initAlexaRemote((error) => {
        if (error) {
          this.logger.error('Failed to initialize.', error);
          return;
        }

        this.logger.debug('Alexa cookie retrieved successfully.');
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories[accessory.UUID] = accessory;
  }

  initAlexaRemote(callback: CallbackWithError) {
    this.alexaRemote.on('cookie', () => {
      const cookieData = this.alexaRemote.cookieData;
      if (util.isValidAuthentication(cookieData as unknown as Nullable<Record<string, string | object | number>>)) {
        this.logger.debug('Cookie updated. Do not share with anyone.', { cookieData });
        fs.writeFileSync(this.persistPath, JSON.stringify({ cookieData }));
      }
    });

    const auth = util.getAuthentication(this.persistPath);
    this.alexaRemote.init(
      {
        acceptLanguage: this.config.language ?? 'en-US',
        alexaServiceHost: `pitangui.${this.config.amazonDomain}`,
        amazonPage: this.config.amazonDomain,
        amazonPageProxyLanguage: this.config.language?.replace('-', '_') ?? 'en_US',
        formerRegistrationData: auth || {},
        cookieRefreshInterval: this.config.auth.refreshInterval,
        cookie: auth?.localCookie,
        macDms: auth?.macDms,
        proxyOwnIp: this.config.auth.proxy.clientHost,
        proxyPort: this.config.auth.proxy.port,
        useWsMqtt: false,
      } as InitOptions,
      callback,
    );
  }
}
