import AlexaRemote, { InitOptions } from 'alexa-remote2';
import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import * as IO from 'fp-ts/IO';
import * as IOE from 'fp-ts/IOEither';
import { IOEither } from 'fp-ts/IOEither';
import * as J from 'fp-ts/Json';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
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
import AccessoryFactory from './accessory/accessory-factory';
import BaseAccessory from './accessory/base-accessory';
import { AlexaDeviceError, AlexaError } from './domain/alexa/errors';
import { SmartHomeDevice } from './domain/alexa/get-devices';
import { AlexaPlatformConfig } from './domain/homebridge';
import { mapAlexaDeviceToHomeKitAccessoryInfos } from './mapper';
import * as settings from './settings';
import DeviceStore from './store/device-store';
import * as util from './util';
import { getOrElse } from './util/fp-util';
import { PluginLogger } from './util/plugin-logger';
import { AlexaApiWrapper } from './wrapper/alexa-api-wrapper';

export class AlexaSmartHomePlatform implements DynamicPlatformPlugin {
  public readonly HAP: API['hap'] = this.api.hap;

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly log: PluginLogger;
  public readonly config: AlexaPlatformConfig;
  public readonly alexaRemote: AlexaRemote;
  public readonly alexaApi: AlexaApiWrapper;
  public readonly deviceStore: DeviceStore;

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
    this.deviceStore = new DeviceStore(this.log, this.config.performance);
    this.alexaApi = new AlexaApiWrapper(
      this.alexaRemote,
      this.log,
      this.deviceStore,
    );

    let refreshTimeout: NodeJS.Timeout | undefined;

    const handleAuthResult = flow(
      O.match(
        () => {
          this.alexaRemote.cookie;
          return this.log.debug('Successfully authenticated Alexa account.');
        },
        (e: Error) =>
          this.log.errorT('Failed to initialize connection to Alexa.', e),
      ),
    );

    api.on('didFinishLaunching', () => {
      this.initAlexaRemote((maybeError) => {
        pipe(
          TE.rightIO(handleAuthResult(maybeError)),
          TE.flatMap(this.findDevices.bind(this)),
          TE.tap((devices) =>
            pipe(
              [
                TE.asUnit(
                  this.alexaApi.getDeviceStates(devices.map(({ id }) => id)),
                ),
                this.alexaApi.saveDeviceCapabilities(),
              ],
              A.traverse(TE.ApplicativePar)(identity),
            ),
          ),
          TE.flatMap(this.initDevices.bind(this)),
          TE.flatMapIO(this.findStaleAccessories.bind(this)),
        )()
          .then(
            E.match(
              (e) => this.log.errorT('After initialization', e)(),
              this.unregisterStaleAccessories.bind(this),
            ),
          )
          .then(() => {
            if (this.config.performance?.backgroundRefresh) {
              const scheduleRefresh = () => {
                refreshTimeout = setTimeout(() => {
                  this.alexaApi
                    .getDeviceStates(this.activeDeviceIds, 'ENTITY', false)()
                    .finally(() => {
                      scheduleRefresh();
                    });
                }, this.deviceStore.cacheTTL - 30_000);
              };
              scheduleRefresh();
            }
          });
      });
    });

    this.api.on('shutdown', () => {
      !!refreshTimeout && clearTimeout(refreshTimeout);
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName)();
    this.cachedAccessories.push(accessory);
  }

  initAlexaRemote(
    callback: (error: Option<Error>) => void,
    firstAttempt = true,
  ) {
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
          'Login required because existing authentication not found',
        )();
        return undefined;
      },
      (e) => {
        this.log.errorT('Error trying to retrieve stored authentication', e)();
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
            deviceAppName: 'Homebridge',
            macDms: auth?.macDms,
            proxyOwnIp: this.config.auth.proxy.clientHost.replace(
              /^https?:\/\//,
              '',
            ),
            proxyPort: this.config.auth.proxy.port,
            useWsMqtt: false,
          } as InitOptions,
          (error) => {
            pipe(
              O.fromNullable(error),
              O.match(
                () => callback(O.none),
                (e) => {
                  if (firstAttempt && e.message.includes('401 Unauthorized')) {
                    fs.rmSync(this.persistPath);
                    this.initAlexaRemote(callback, false);
                  } else {
                    callback(O.of(e));
                  }
                },
              ),
            );
          },
        ),
      ),
    )();
  }

  findDevices(): TE.TaskEither<AlexaError, SmartHomeDevice[]> {
    const deviceFilter = pipe(
      O.fromNullable(this.config.devices),
      O.map(A.map((d) => d.trim())),
      O.getOrElse(constant(new Array<string>())),
    );
    return pipe(
      this.alexaApi.getDevices(),
      TE.tapIO((devices) =>
        this.log.debug(
          `Found ${devices.length} devices connected to the current Alexa account.`,
        ),
      ),
      TE.tap(
        flow(
          A.filterMap(({ displayName, providerData }) =>
            providerData.categoryType !== 'GROUP'
              ? O.of({ displayName, deviceType: providerData.deviceType })
              : O.none,
          ),
          util.stringifyJson,
          TE.fromEither,
          TE.tapIO((json) =>
            this.log.debug(`Devices connected to Alexa account: ${json}`),
          ),
        ),
      ),
      TE.map(
        A.filter((d: SmartHomeDevice) =>
          A.isEmpty(deviceFilter)
            ? true
            : deviceFilter.includes(d.displayName.trim()),
        ),
      ),
      TE.tapIO((devices) =>
        devices.length === deviceFilter.length
          ? this.log.debug(
            `Found all ${deviceFilter.length} devices in plugin settings.`,
          )
          : this.log.warn(
            `${deviceFilter.length} devices found in plugin settings but only ${devices.length} matched.`,
          ),
      ),
    );
  }

  initDevices(
    devices: SmartHomeDevice[],
  ): TE.TaskEither<AlexaError | void, BaseAccessory[]> {
    const initUserConfiguredDevices = flow(
      A.map(flow(this.initAccessories.bind(this), IO.FromIO.fromIO)),
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
      TE.map(flow(A.filterMap(identity), A.flatten)),
    );
  }

  initAccessories(
    device: SmartHomeDevice,
  ): IOEither<AlexaDeviceError, BaseAccessory[]> {
    return pipe(
      E.bindTo('entityId')(util.extractEntityId(device.id)),
      E.bind('hbAccessories', ({ entityId }) =>
        mapAlexaDeviceToHomeKitAccessoryInfos(this, entityId, device),
      ),
      E.map(({ entityId, hbAccessories }) =>
        pipe(
          hbAccessories,
          A.map((hbAcc) => ({
            ...hbAcc,
            entityId,
            maybeCachedAcc: pipe(
              this.cachedAccessories,
              A.findFirst(
                ({ UUID: cachedUuid, context }) =>
                  cachedUuid === hbAcc.uuid &&
                  context.deviceType === device.providerData.deviceType &&
                  (context.homebridgeDeviceType ?? hbAcc.deviceType) ===
                    hbAcc.deviceType,
              ),
            ),
          })),
        ),
      ),
      IOE.fromEither,
      IOE.tapIO(() => {
        const deviceJson = JSON.stringify(device, undefined, 2);
        return this.log.debug(
          `Attempting to add accessory(s) for device: ${deviceJson}. Current state: ${JSON.stringify(
            this.deviceStore.getCacheStatesForDevice(device.id),
          )}. Range capabilities: ${JSON.stringify(
            this.deviceStore.getRangeCapabilitiesForDevice(device.id),
          )}`,
        );
      }),
      IOE.flatMap((hkDevices) =>
        pipe(
          hkDevices,
          A.traverse(IOE.ApplicativeSeq)((hbAcc) => {
            const newDevice = {
              ...device,
              displayName: getOrElse(
                hbAcc.altDeviceName,
                constant(device.displayName),
              ),
            };
            return pipe(
              O.bindTo('platAcc')(hbAcc.maybeCachedAcc),
              O.fold(
                () =>
                  this.addNewAccessory(newDevice, hbAcc.deviceType, hbAcc.uuid),
                ({ platAcc }) =>
                  this.restoreExistingAccessory(
                    newDevice,
                    hbAcc.deviceType,
                    platAcc,
                  ),
              ),
            );
          }),
        ),
      ),
    );
  }

  private restoreExistingAccessory(
    device: SmartHomeDevice,
    hbDeviceType: string,
    acc: PlatformAccessory,
  ): IOEither<AlexaDeviceError, BaseAccessory> {
    if (
      !acc.context?.deviceId ||
      !acc.context?.deviceType ||
      !acc.context?.homebridgeDeviceType
    ) {
      this.log.info('Update accessory context:', acc.displayName)();
      acc.context = {
        ...acc.context,
        deviceId: device.id,
        deviceType: device.providerData.deviceType,
        homebridgeDeviceType: hbDeviceType,
      };
      this.api.updatePlatformAccessories([acc]);
    }
    return pipe(
      IOE.Do,
      IOE.flatMapEither(() =>
        AccessoryFactory.createAccessory(this, acc, device, hbDeviceType),
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
    hbDeviceType: string,
    uuid: string,
  ): IOEither<AlexaDeviceError, BaseAccessory> {
    const platAcc = new this.api.platformAccessory(device.displayName, uuid);
    platAcc.context = {
      ...platAcc.context,
      deviceId: device.id,
      deviceType: device.providerData.deviceType,
      homebridgeDeviceType: hbDeviceType,
    };

    return pipe(
      IOE.Do,
      IOE.flatMapEither(() =>
        AccessoryFactory.createAccessory(this, platAcc, device, hbDeviceType),
      ),
      IOE.tapIO(() => this.log.info('Added accessory:', device.displayName)),
      IOE.tapEither((acc) => {
        acc.isExternalAccessory
          ? this.api.publishExternalAccessories(settings.PLUGIN_NAME, [platAcc])
          : this.api.registerPlatformAccessories(
            settings.PLUGIN_NAME,
            settings.PLATFORM_NAME,
            [platAcc],
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
}
