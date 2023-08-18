import AlexaRemote, { CallbackWithError, InitOptions } from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { constVoid, pipe } from 'fp-ts/lib/function';
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
import AccessoryFactory from './accessory/AccessoryFactory';
import BaseAccessory from './accessory/BaseAccessory';
import LightAccessory from './accessory/LightAccessory';
import * as config from './config';
import { Nullable } from './domain';
import { SmartHomeDevice } from './domain/alexa/get-devices';
import { AlexaPlatformConfig } from './domain/homebridge';
import { AlexaApiError } from './errors';
import { PluginLogger } from './plugin-logger';
import * as util from './util';
import { AlexaApiWrapper } from './wrapper/alexa-api-wrapper';

export class AlexaSmartHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly logger: PluginLogger;
  public readonly config: AlexaPlatformConfig;
  public readonly alexaRemote: AlexaRemote;
  public readonly alexaApi: AlexaApiWrapper;

  public cachedAccessories: PlatformAccessory[] = [];
  public accessoryHandlers: BaseAccessory[] = [];
  public devices: SmartHomeDevice[] = [];

  private readonly persistPath: string;

  constructor(
    readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.logger = new PluginLogger(log, config);

    if (util.validateConfig(config)) {
      this.config = config;
    } else {
      this.logger.error(
        'Missing configuration for this plugin to work, see the documentation for initial setup.',
      );
      return;
    }

    this.persistPath = `${api.user.persistPath()}/.${config.PLUGIN_NAME}`;
    this.alexaRemote = new AlexaRemote();
    this.alexaApi = new AlexaApiWrapper(this.alexaRemote, this.logger);

    api.on('didFinishLaunching', () => {
      this.logger.debug('Executed didFinishLaunching callback');
      this.initAlexaRemote((error) => {
        if (error) {
          this.logger.error('Failed to initialize.', error);
          return;
        }
        this.logger.debug('Successfully authenticated Alexa account.');
        pipe(
          this.initDevices(),
          TE.map(A.map(({ accessory: { UUID } }) => UUID)),
          TE.map((activeAccessoryIds) =>
            pipe(
              this.cachedAccessories,
              A.filter(({ UUID }) => !activeAccessoryIds.includes(UUID)),
            ),
          ),
        )().then(
          E.match(
            (e) => this.logger.errorT('didFinishLaunching', e),
            this.unregisterStaleAccessories.bind(this),
          ),
        );
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.push(accessory);
  }

  initDevices(): TE.TaskEither<AlexaApiError, BaseAccessory[]> {
    const deviceFilter = this.config.devices ?? [];
    return pipe(
      TE.bindTo('devices')(this.alexaApi.getDevices()),
      TE.map(({ devices }) =>
        pipe(
          devices,
          A.filter((d) =>
            A.isEmpty(deviceFilter)
              ? true
              : deviceFilter.includes(d.displayName),
          ),
          A.traverse(T.ApplicativePar)(this.handleAccessory.bind(this)),
        ),
      ),
      TE.flatMap((devices) =>
        TE.fromTask(T.ApplicativePar.map(devices, A.separate)),
      ),
      TE.map(({ left: errors, right: handlers }) => {
        errors.forEach((e) => this.logger.errorT('initDevices', e));
        handlers.forEach((h) => {
          if (h instanceof LightAccessory) {
            h.handleOnSet(false);
          }
        });
        return handlers;
      }),
    );
  }

  handleAccessory(
    device: SmartHomeDevice,
  ): TE.TaskEither<string, BaseAccessory> {
    const uuid = this.api.hap.uuid.generate(device.id);
    return pipe(
      O.bindTo('acc')(
        pipe(
          this.cachedAccessories,
          A.findFirst(({ UUID: cachedUuid }) => cachedUuid === uuid),
        ),
      ),
      O.fold(
        () => this.addNewAccessory(device, uuid),
        ({ acc }) => this.restoreExistingAccessory(device, acc),
      ),
    );
  }

  initAlexaRemote(callback: CallbackWithError) {
    this.alexaRemote.on('cookie', () => {
      const cookieData = this.alexaRemote.cookieData;
      if (
        util.isValidAuthentication(
          cookieData as unknown as Nullable<
            Record<string, string | object | number>
          >,
        )
      ) {
        this.logger.debug('Cookie updated. Do not share with anyone.', {
          cookieData,
        });
        fs.writeFileSync(this.persistPath, JSON.stringify({ cookieData }));
      }
    });

    const auth = util.getAuthentication(this.persistPath);
    const amazonDomain =
      this.config.amazonDomain ?? config.DEFAULT_AMAZON_DOMAIN;
    this.alexaRemote.init(
      {
        acceptLanguage: this.config.language ?? config.DEFAULT_ACCEPT_LANG,
        alexaServiceHost: `alexa.${amazonDomain}`,
        amazonPage: amazonDomain,
        amazonPageProxyLanguage:
          this.config.language?.replace('-', '_') ??
          config.DEFAULT_PROXY_PAGE_LANG,
        formerRegistrationData: auth || {},
        cookieRefreshInterval:
          (this.config.auth.refreshInterval ??
            config.DEFAULT_REFRESH_INTERVAL_DAYS) * config.ONE_DAY_MILLIS,
        cookie: auth?.localCookie,
        macDms: auth?.macDms,
        proxyOwnIp: this.config.auth.proxy.clientHost,
        proxyPort: this.config.auth.proxy.port,
        useWsMqtt: false,
      } as InitOptions,
      callback,
    );
  }

  private restoreExistingAccessory(
    device: SmartHomeDevice,
    acc: PlatformAccessory,
  ): TE.TaskEither<string, BaseAccessory> {
    this.logger.info(
      'Restoring existing accessory from cache:',
      acc.displayName,
    );
    this.logger.debug('Existing accessory:', device);

    if (!acc.context?.deviceId || !acc.context?.supportedOperations) {
      this.logger.info('Update accessory context:', acc.displayName);
      acc.context = {
        ...acc.context,
        deviceId: device.id,
        supportedOperations: device.supportedOperations,
      };
      this.api.updatePlatformAccessories([acc]);
    }
    return pipe(
      AccessoryFactory.createAccessory(this, acc, device),
      TE.tap(() => {
        this.devices.push(device);
        return TE.right(constVoid);
      }),
    );
  }

  private addNewAccessory(
    device: SmartHomeDevice,
    uuid: string,
  ): TE.TaskEither<string, BaseAccessory> {
    this.logger.info('Adding new accessory:', device.displayName);
    this.logger.debug('New accessory:', device);

    const acc = new this.api.platformAccessory(device.displayName, uuid);
    acc.context = {
      ...acc.context,
      deviceId: device.id,
      supportedOperations: device.supportedOperations,
    };

    return pipe(
      AccessoryFactory.createAccessory(this, acc, device),
      TE.tap(() => {
        this.api.registerPlatformAccessories(
          config.PLUGIN_NAME,
          config.PLATFORM_NAME,
          [acc],
        );
        this.devices.push(device);
        return TE.right(constVoid);
      }),
    );
  }

  private unregisterStaleAccessories(
    staleAccessories: PlatformAccessory[],
  ): void {
    staleAccessories.forEach((staleAccessory) => {
      this.logger.info(
        `Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`,
      );
    });

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(
        config.PLUGIN_NAME,
        config.PLATFORM_NAME,
        staleAccessories,
      );
    }
  }
}
