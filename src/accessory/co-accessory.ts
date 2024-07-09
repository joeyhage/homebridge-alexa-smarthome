import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { AirQualityMonitorState } from '../domain/alexa/air-quality-monitor';
import { CarbonMonoxideRangeFeatures } from '../domain/alexa/carbon-monoxide-sensor';
import { RangeCapabilityAsset } from '../domain/alexa/save-device-capabilities';
import * as mapper from '../mapper/air-quality-mapper';
import BaseAccessory from './base-accessory';

export default class CarbonMonoxideAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.CarbonMonoxideSensor) ||
      this.platformAcc.addService(
        this.Service.CarbonMonoxideSensor,
        this.device.displayName,
      );

    pipe(
      CarbonMonoxideRangeFeatures,
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
    const determineCoDetected = flow(
      A.findFirst<AirQualityMonitorState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
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
      this.getStateGraphQl(determineCoDetected),
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
      this.getStateGraphQl(this.determineLevel(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get carbon monoxide level', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  private determineLevel(asset: RangeCapabilityAsset) {
    return flow(
      A.findFirst<AirQualityMonitorState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
      ),
      O.tap(({ value }) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get ${asset.configurationName}: ${value}`,
          ),
        ),
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
    );
  }
}
