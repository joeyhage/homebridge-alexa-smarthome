import AlexaRemote, { CallbackWithError, InitOptions } from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import * as IO from 'fp-ts/IO';
import * as IOE from 'fp-ts/IOEither';
import * as J from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { match as fpMatch } from 'fp-ts/lib/boolean';
import { constVoid, constant, flow, identity, pipe } from 'fp-ts/lib/function';
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
import { Pattern, match } from 'ts-pattern';
import AccessoryFactory from './accessory/AccessoryFactory';
import BaseAccessory from './accessory/BaseAccessory';
import LightAccessory from './accessory/LightAccessory';
import { SmartHomeDevice } from './domain/alexa/get-devices';
import { AlexaPlatformConfig } from './domain/homebridge';
import { AlexaApiError } from './errors';
import { PluginLogger } from './plugin-logger';
import * as settings from './settings';
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
      )();
      return;
    }

    this.persistPath = `${api.user.persistPath()}/.${settings.PLUGIN_NAME}`;
    this.alexaRemote = new AlexaRemote();
    this.alexaApi = new AlexaApiWrapper(this.alexaRemote, this.logger);

    api.on('didFinishLaunching', () => {
      this.logger.debug('Executed didFinishLaunching callback')();
      this.initAlexaRemote((error) => {
        pipe(
          TE.rightIO(
            pipe(
              !!error,
              fpMatch(
                () =>
                  this.logger.debug(
                    'Successfully authenticated Alexa account.',
                  ),
                () => this.logger.error('Failed to initialize.', error),
              ),
            ),
          ),
          TE.flatMap(this.initDevices.bind(this)),
          TE.map(A.map(({ accessory: { UUID } }) => UUID)),
          TE.map((activeAccessoryIds) =>
            pipe(
              this.cachedAccessories,
              A.filter(({ UUID }) => !activeAccessoryIds.includes(UUID)),
            ),
          ),
        )().then(
          E.match(
            (e) => this.logger.errorT('didFinishLaunching', e)(),
            this.unregisterStaleAccessories.bind(this),
          ),
        );
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.logger.info('Loading accessory from cache:', accessory.displayName)();
    this.cachedAccessories.push(accessory);
  }

  initDevices(): TE.TaskEither<AlexaApiError | void, BaseAccessory[]> {
    const deviceFilter = this.config.devices ?? [];

    const findUserConfiguredDevices = flow(
      A.filter((d: SmartHomeDevice) =>
        A.isEmpty(deviceFilter) ? true : deviceFilter.includes(d.displayName),
      ),
      A.traverse(T.ApplicativePar)(this.initAccessory.bind(this)),
    );

    const handleInitAccessoryErrors = flow(
      A.map((e: string) => this.logger.errorT('initDevices', e)),
      A.sequence(IO.Applicative),
      TE.fromIO,
    );

    const setInitialStates = flow(
      A.map((h: BaseAccessory) =>
        match(h)
          .with(Pattern.instanceOf(LightAccessory), (h) =>
            TE.tryCatch(
              () => h.handleOnSet(false),
              (e) => this.logger.errorT('handleOnSet', e)(),
            ),
          )
          .otherwise(constant(TE.right(constVoid()))),
      ),
    );

    return pipe(
      this.alexaApi.getDevices(),
      TE.map(findUserConfiguredDevices),
      TE.flatMap((devices) =>
        TE.fromTask(T.ApplicativePar.map(devices, A.separate)),
      ),
      TE.flatMap(({ left: errors, right: handlers }) =>
        pipe(
          handleInitAccessoryErrors(errors),
          TE.flatMap(() => TE.sequenceArray(setInitialStates(handlers))),
          TE.map(constant(handlers)),
        ),
      ),
    );
  }

  initAccessory(device: SmartHomeDevice): TE.TaskEither<string, BaseAccessory> {
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
      if (util.isValidAuthentication(cookieData as unknown as J.Json)) {
        this.logger.debug('Cookie updated. Do not share with anyone.', {
          cookieData,
        })();
        fs.writeFileSync(this.persistPath, JSON.stringify({ cookieData }));
      }
    });

    const logStoredAuthErrors = O.match(
      () => {
        this.logger.debug(
          'Login required because existing authentication not found.',
        )();
        return undefined;
      },
      (e) => {
        this.logger.errorT(
          'Error trying to retrieve stored authentication.',
          e,
        )();
        return undefined;
      },
    );

    const amazonDomain =
      this.config.amazonDomain ?? settings.DEFAULT_AMAZON_DOMAIN;
    pipe(
      util.getAuthentication(this.persistPath),
      IOE.match(logStoredAuthErrors, identity),
      IO.map((auth) =>
        this.alexaRemote.init(
          {
            acceptLanguage:
              this.config.language ?? settings.DEFAULT_ACCEPT_LANG,
            alexaServiceHost: `alexa.${amazonDomain}`,
            amazonPage: amazonDomain,
            amazonPageProxyLanguage:
              this.config.language?.replace('-', '_') ??
              settings.DEFAULT_PROXY_PAGE_LANG,
            formerRegistrationData: auth,
            cookieRefreshInterval:
              (this.config.auth.refreshInterval ??
                settings.DEFAULT_REFRESH_INTERVAL_DAYS) *
              settings.ONE_DAY_MILLIS,
            cookie: auth?.localCookie,
            macDms: auth?.macDms,
            proxyOwnIp: this.config.auth.proxy.clientHost,
            proxyPort: this.config.auth.proxy.port,
            useWsMqtt: false,
          } as InitOptions,
          callback,
        ),
      ),
    )();
  }

  private restoreExistingAccessory(
    device: SmartHomeDevice,
    acc: PlatformAccessory,
  ): TE.TaskEither<string, BaseAccessory> {
    this.logger.info(
      'Restoring existing accessory from cache:',
      acc.displayName,
    )();
    this.logger.debug('Existing accessory:', device)();

    if (!acc.context?.deviceId || !acc.context?.supportedOperations) {
      this.logger.info('Update accessory context:', acc.displayName)();
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
        return TE.of(constVoid);
      }),
    );
  }

  private addNewAccessory(
    device: SmartHomeDevice,
    uuid: string,
  ): TE.TaskEither<string, BaseAccessory> {
    this.logger.info('Adding new accessory:', device.displayName)();
    this.logger.debug('New accessory:', device)();

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
          settings.PLUGIN_NAME,
          settings.PLATFORM_NAME,
          [acc],
        );
        this.devices.push(device);
        return TE.of(constVoid);
      }),
    );
  }

  private unregisterStaleAccessories(
    staleAccessories: PlatformAccessory[],
  ): void {
    staleAccessories.forEach((staleAccessory) => {
      this.logger.info(
        `Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`,
      )();
    });

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(
        settings.PLUGIN_NAME,
        settings.PLATFORM_NAME,
        staleAccessories,
      );
    }
  }

  private setInitialAccessoryStates() {
    return flow(
      A.map((h: BaseAccessory) =>
        match(h)
          .with(Pattern.instanceOf(LightAccessory), (h) =>
            TE.tryCatch(
              () => h.handleOnSet(false),
              (e) => this.logger.errorT('handleOnSet', e)(),
            ),
          )
          .otherwise(constant(TE.right(constVoid()))),
      ),
    );
  }
}
