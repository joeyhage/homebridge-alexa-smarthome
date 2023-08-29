import AlexaRemote, { InitOptions } from 'alexa-remote2';
import * as E from 'fp-ts/Either';
import * as IO from 'fp-ts/IO';
import * as IOE from 'fp-ts/IOEither';
import { IOEither } from 'fp-ts/IOEither';
import * as J from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
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
import { match } from 'ts-pattern';
import AccessoryFactory from './accessory/accessory-factory';
import BaseAccessory from './accessory/base-accessory';
import { AlexaDeviceError, AlexaError } from './domain/alexa/errors';
import { SmartHomeDevice } from './domain/alexa/get-devices';
import { AlexaPlatformConfig } from './domain/homebridge';
import { ValidationError } from './domain/homebridge/errors';
import * as settings from './settings';
import * as util from './util';
import { PluginLogger } from './util/plugin-logger';
import { AlexaApiWrapper } from './wrapper/alexa-api-wrapper';

export class AlexaSmartHomePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly log: PluginLogger;
  public readonly config: AlexaPlatformConfig;
  public readonly alexaRemote: AlexaRemote;
  public readonly alexaApi: AlexaApiWrapper;

  public cachedAccessories: PlatformAccessory[] = [];
  public accessoryHandlers: BaseAccessory[] = [];
  public activeDeviceIds: string[] = [];

  private readonly persistPath: string;

  constructor(
    readonly logger: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log = new PluginLogger(logger, config);

    if (util.validateConfig(config)) {
      this.config = config;
    } else {
      this.log.error(
        'Missing configuration for this plugin to work, see the documentation for initial setup.',
      )();
      return;
    }

    this.persistPath = `${api.user.persistPath()}/.${settings.PLUGIN_NAME}`;
    this.alexaRemote = new AlexaRemote();
    this.alexaApi = new AlexaApiWrapper(this.alexaRemote, this.log);

    api.on('didFinishLaunching', () => {
      this.initAlexaRemote((result) => {
        pipe(
          TE.rightIO(result),
          TE.flatMap(this.findDevices.bind(this)),
          TE.tap((devices) =>
            this.alexaApi.getDeviceStates(devices.map(({ id }) => id)),
          ),
          TE.flatMap(this.initDevices.bind(this)),
          TE.flatMapIO(this.findStaleAccessories.bind(this)),
        )().then(
          E.match(
            (e) => this.log.errorT('After initialization', e)(),
            this.unregisterStaleAccessories.bind(this),
          ),
        );
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName)();
    this.cachedAccessories.push(accessory);
  }

  findDevices(): TE.TaskEither<AlexaError, SmartHomeDevice[]> {
    const deviceFilter = this.config.devices ?? [];
    return pipe(
      this.alexaApi.getDevices(),
      TE.map(
        A.filter((d: SmartHomeDevice) =>
          A.isEmpty(deviceFilter) ? true : deviceFilter.includes(d.displayName),
        ),
      ),
    );
  }

  initDevices(
    devices: SmartHomeDevice[],
  ): TE.TaskEither<AlexaError | void, BaseAccessory[]> {
    const initUserConfiguredDevices = flow(
      A.map((device: SmartHomeDevice) =>
        IO.FromIO.fromIO(this.initAccessory(device)),
      ),
      A.map(
        IO.flatMap(
          E.match(
            (e) => IO.as(this.log.errorT('Initialize Devices', e), O.none),
            (acc) => IO.of(O.of(acc)),
          ),
        ),
      ),
      A.traverse(IO.Applicative)(identity),
    );

    return pipe(
      TE.of(devices),
      TE.flatMapIO(initUserConfiguredDevices),
      TE.map(A.filterMap(identity)),
    );
  }

  initAccessory(
    device: SmartHomeDevice,
  ): IOEither<AlexaDeviceError, BaseAccessory> {
    return pipe(
      E.bindTo('entityId')(util.extractEntityId(device.id)),
      E.bind('uuid', ({ entityId }) =>
        E.of(
          this.api.hap.uuid.generate(
            `${entityId}:${device.providerData.deviceType}`,
          ),
        ),
      ),
      E.bind('maybeAcc', ({ uuid }) =>
        pipe(
          this.cachedAccessories,
          A.findFirst(
            ({ UUID: cachedUuid, context }) =>
              cachedUuid === uuid &&
              context.deviceType === device.providerData.deviceType,
          ),
          E.of<AlexaDeviceError, Option<PlatformAccessory>>,
        ),
      ),
      IOE.fromEither,
      IOE.flatMap(({ maybeAcc, uuid }) =>
        pipe(
          maybeAcc,
          O.fold(
            () => this.addNewAccessory(device, uuid),
            (acc) => this.restoreExistingAccessory(device, acc),
          ),
        ),
      ),
    );
  }

  initAlexaRemote(callback: (io: IO.IO<Option<Error>>) => void) {
    this.alexaRemote.on('cookie', () => {
      const cookieData = this.alexaRemote.cookieData;
      if (util.isValidAuthentication(cookieData as unknown as J.Json)) {
        this.log.debug('Cookie updated. Do not share with anyone.', {
          cookieData,
        })();
        fs.writeFileSync(this.persistPath, JSON.stringify({ cookieData }));
      }
    });

    const logStoredAuthErrors = O.match(
      () => {
        this.log.debug(
          'Login required because existing authentication not found.',
        )();
        return undefined;
      },
      (e) => {
        this.log.errorT('Error trying to retrieve stored authentication.', e)();
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
          (error) => {
            callback(
              pipe(
                !!error,
                fpMatch(
                  () =>
                    IO.as(
                      this.log.debug(
                        'Successfully authenticated Alexa account.',
                      ),
                      O.none,
                    ),
                  () =>
                    IO.as(
                      this.log.error('Failed to initialize.', error),
                      O.of(error!),
                    ),
                ),
              ),
            );
          },
        ),
      ),
    )();
  }

  private restoreExistingAccessory(
    device: SmartHomeDevice,
    acc: PlatformAccessory,
  ): IOEither<AlexaDeviceError, BaseAccessory> {
    if (!acc.context?.deviceId || !acc.context?.deviceType) {
      this.log.info('Update accessory context:', acc.displayName)();
      acc.context = {
        ...acc.context,
        deviceId: device.id,
        deviceType: device.providerData.deviceType,
      };
      this.api.updatePlatformAccessories([acc]);
    }
    return pipe(
      IOE.Do,
      IOE.tapIO(() =>
        this.log.debug(
          'Attempting to restore existing accessory from cache:',
          device,
        ),
      ),
      IOE.flatMapEither(() =>
        AccessoryFactory.createAccessory(this, acc, device),
      ),
      IOE.tapIO(() =>
        this.log.info(
          'Restored existing accessory from cache:',
          device.displayName,
        ),
      ),
      IOE.tapEither(() => {
        this.activeDeviceIds.push(device.id);
        return E.of(constVoid());
      }),
    );
  }

  private addNewAccessory(
    device: SmartHomeDevice,
    uuid: string,
  ): IOEither<AlexaDeviceError, BaseAccessory> {
    const acc = new this.api.platformAccessory(device.displayName, uuid);
    acc.context = {
      ...acc.context,
      deviceId: device.id,
      deviceType: device.providerData.deviceType,
    };

    return pipe(
      IOE.Do,
      IOE.tapIO(() =>
        this.log.debug('Attempting to add new accessory:', device),
      ),
      IOE.flatMapEither(() =>
        AccessoryFactory.createAccessory(this, acc, device),
      ),
      IOE.tapIO(() =>
        this.log.info('Added new accessory:', device.displayName),
      ),
      IOE.tapEither(() => {
        this.api.registerPlatformAccessories(
          settings.PLUGIN_NAME,
          settings.PLATFORM_NAME,
          [acc],
        );
        this.activeDeviceIds.push(device.id);
        return E.of(constVoid());
      }),
    );
  }

  private findStaleAccessories(
    activeAccessories: BaseAccessory[],
  ): IO.IO<PlatformAccessory[]> {
    return pipe(
      IO.of(
        A.Functor.map(activeAccessories, ({ platformAcc: { UUID } }) => UUID),
      ),
      IO.map((activeAccessoryIds) =>
        A.Filterable.filter(
          this.cachedAccessories,
          ({ UUID }) => !activeAccessoryIds.includes(UUID),
        ),
      ),
    );
  }

  private unregisterStaleAccessories(
    staleAccessories: PlatformAccessory[],
  ): void {
    staleAccessories.forEach((staleAccessory) => {
      this.log.info(
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

  private failIfZeroValidIds({ entityIds: { right: validIds } }) {
    match(validIds)
      .when(A.isNonEmpty, constant(TE.of(validIds)))
      .otherwise(
        constant(
          TE.left(new ValidationError('No valid device ids were found')),
        ),
      );
  }
}
