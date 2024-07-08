import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { AirQualityMonitorState } from '../domain/alexa/air-quality-monitor';
import { HumiditySensorRangeFeatures } from '../domain/alexa/humidity-sensor';
import { RangeCapabilityAsset } from '../domain/alexa/save-device-capabilities';
import BaseAccessory from './base-accessory';

export default class HumidityAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.HumiditySensor) ||
      this.platformAcc.addService(
        this.Service.HumiditySensor,
        this.device.displayName,
      );

    pipe(
      HumiditySensorRangeFeatures,
      RA.findFirstMap((a) => RR.lookup(a)(this.rangeCapabilities)),
      O.match(
        () =>
          this.logWithContext(
            'error',
            `Humidity sensor was not created for ${this.device.displayName}`,
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
            .onGet(this.handleHumidityGet.bind(this, asset));
        },
      ),
    );
  }

  async handleHumidityGet(asset: RangeCapabilityAsset): Promise<number> {
    return pipe(
      this.getStateGraphQl(this.determineLevel(asset)),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get humidity', e);
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
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(
          this.logWithContext('debug', `Get ${asset.configurationName}: ${s}`),
        ),
      ),
    );
  }
}
