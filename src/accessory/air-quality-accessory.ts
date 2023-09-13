import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import {
  AirQualityAssets,
  AirQualityMonitorNamespaces,
  AirQualityMonitorState,
} from '../domain/alexa/air-quality-monitor';
import { RangeCapabilityAsset } from '../domain/alexa/save-device-capabilities';
import * as mapper from '../mapper/air-quality-mapper';
import BaseAccessory from './base-accessory';

export default class AirQualityAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  namespaces = AirQualityMonitorNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.AirQualitySensor) ||
      this.platformAcc.addService(
        this.Service.AirQualitySensor,
        this.device.displayName,
      );

    pipe(
      AirQualityAssets,
      RA.findFirstMap((a) => RR.lookup(a)(this.rangeCapabilities)),
      O.match(
        () =>
          this.logWithContext(
            'error',
            `Air quality sensor was not created for ${this.device.displayName}`,
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.platform.Characteristic.AirQuality)
            .onGet(this.handleAirQualityGet.bind(this, asset));
        },
      ),
    );

    pipe(
      this.rangeCapabilities,
      RR.lookup('Alexa.AirQuality.ParticulateMatter'),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.platform.Characteristic.PM2_5Density)
          .onGet(this.handlePM25DensityGet.bind(this, asset));
      }),
    );

    pipe(
      this.rangeCapabilities,
      RR.lookup('Alexa.AirQuality.VolatileOrganicCompounds'),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.platform.Characteristic.VOCDensity)
          .onGet(this.handleVocDensityGet.bind(this, asset));
      }),
    );
  }

  async handleAirQualityGet(asset: RangeCapabilityAsset): Promise<number> {
    const alexaNamespace = 'Alexa.RangeController';
    const determineAirQuality = flow(
      O.filterMap<AirQualityMonitorState[], AirQualityMonitorState>(
        A.findFirst(
          ({ namespace, instance }) =>
            namespace === alexaNamespace && asset.instance === instance,
        ),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaAirQualityToHomeKit(
          value,
          this.Characteristic.AirQuality,
        ),
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get air quality result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determineAirQuality),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get air quality', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handlePM25DensityGet(asset: RangeCapabilityAsset): Promise<number> {
    return pipe(
      this.getState(this.determineDensity(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get PM2.5 density', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleVocDensityGet(asset: RangeCapabilityAsset): Promise<number> {
    return pipe(
      this.getState(this.determineDensity(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get VOC density', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  private determineDensity(asset: RangeCapabilityAsset) {
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
