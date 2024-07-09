import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import {
  AirQualityMonitorState,
  AirQualityRangeFeatures,
} from '../domain/alexa/air-quality-monitor';
import { RangeFeature } from '../domain/alexa/save-device-capabilities';
import * as mapper from '../mapper/air-quality-mapper';
import BaseAccessory from './base-accessory';

export default class AirQualityAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.AirQualitySensor) ||
      this.platformAcc.addService(
        this.Service.AirQualitySensor,
        this.device.displayName,
      );

    pipe(
      AirQualityRangeFeatures,
      RA.findFirstMap((a) => RR.lookup(a)(this.rangeFeatures)),
      O.match(
        () =>
          this.logWithContext(
            'error',
            `Air quality sensor was not created for ${this.device.displayName}`,
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.Characteristic.AirQuality)
            .onGet(this.handleAirQualityGet.bind(this, asset));
        },
      ),
    );

    pipe(
      this.rangeFeatures,
      RR.lookup('Particulate matter'),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.Characteristic.PM2_5Density)
          .onGet(this.handlePM25DensityGet.bind(this, asset));
      }),
    );

    pipe(
      this.rangeFeatures,
      RR.lookup('Volatile organic compounds'),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.Characteristic.VOCDensity)
          .onGet(this.handleVocDensityGet.bind(this, asset));
      }),
    );
  }

  async handleAirQualityGet(asset: RangeFeature): Promise<number> {
    const determineAirQuality = flow(
      A.findFirst<AirQualityMonitorState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
      ),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get air quality result: ${value}`)),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaAirQualityToHomeKit(
          value,
          this.Characteristic.AirQuality,
        ),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineAirQuality),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get air quality', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handlePM25DensityGet(asset: RangeFeature): Promise<number> {
    return pipe(
      this.getStateGraphQl(this.determineDensity(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get PM2.5 density', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleVocDensityGet(asset: RangeFeature): Promise<number> {
    return pipe(
      this.getStateGraphQl(this.determineDensity(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get VOC density', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  private determineDensity(asset: RangeFeature) {
    return flow(
      A.findFirst<AirQualityMonitorState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get ${asset.rangeName}: ${s}`)),
      ),
    );
  }
}
