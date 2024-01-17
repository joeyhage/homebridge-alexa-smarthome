import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import {
  AirQualityMonitorNamespaces,
  AirQualityMonitorState,
} from '../domain/alexa/air-quality-monitor';
import { CarbonMonoxideSensorAssets } from '../domain/alexa/carbon-monoxide-sensor';
import { RangeCapabilityAsset } from '../domain/alexa/save-device-capabilities';
import * as mapper from '../mapper/air-quality-mapper';
import BaseAccessory from './base-accessory';

export default class CarbonMonoxideAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  namespaces = AirQualityMonitorNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.CarbonMonoxideSensor) ||
      this.platformAcc.addService(
        this.Service.CarbonMonoxideSensor,
        this.device.displayName,
      );

    pipe(
      CarbonMonoxideSensorAssets,
      RA.findFirstMap((a) => RR.lookup(a)(this.rangeCapabilities)),
      O.match(
        () =>
          this.logWithContext(
            'error',
            `Carbon monoxide sensor was not created for ${this.device.displayName}`,
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.Characteristic.CarbonMonoxideDetected)
            .onGet(this.handleCarbonMonoxideDetectedGet.bind(this, asset));
          this.service
            .getCharacteristic(this.Characteristic.CarbonMonoxideLevel)
            .onGet(this.handleCarbonMonoxideLevelGet.bind(this, asset));
        },
      ),
    );
  }

  async handleCarbonMonoxideDetectedGet(
    asset: RangeCapabilityAsset,
  ): Promise<number> {
    const alexaNamespace = 'Alexa.RangeController';
    const determineCoDetected = flow(
      O.filterMap<AirQualityMonitorState[], AirQualityMonitorState>(
        A.findFirst(
          ({ namespace, instance }) =>
            namespace === alexaNamespace && asset.instance === instance,
        ),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaCoLevelToHomeKitDetected(
          value,
          this.Characteristic.CarbonMonoxideDetected,
        ),
      ),
      O.tap((s) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get carbon monoxide detected result: ${s}`,
          ),
        ),
      ),
    );

    return pipe(
      this.getState(determineCoDetected),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get carbon monoxide detected', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleCarbonMonoxideLevelGet(
    asset: RangeCapabilityAsset,
  ): Promise<number> {
    return pipe(
      this.getState(this.determineLevel(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get carbon monoxide level', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  private determineLevel(asset: RangeCapabilityAsset) {
    const alexaNamespace = 'Alexa.RangeController';
    return flow(
      O.filterMap<AirQualityMonitorState[], AirQualityMonitorState>(
        A.findFirst(
          ({ namespace, instance }) =>
            namespace === alexaNamespace && asset.instance === instance,
        ),
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get ${asset.assetId}: ${s}`)),
      ),
    );
  }
}
