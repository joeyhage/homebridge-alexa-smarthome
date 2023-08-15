import AlexaRemote from 'alexa-remote2';
import type { API, PlatformConfig } from 'homebridge';
import GetDevicesResponse from './domain/alexa/get-devices';
import { PluginLogger } from './plugin-logger';

export class AlexaApiWrapper {
  constructor(
    private readonly config: PlatformConfig,
    private readonly api: API,
    private readonly logger: PluginLogger,
    private readonly alexaRemote: AlexaRemote,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getDevices(): Promise<GetDevicesResponse> {
    return new Promise<GetDevicesResponse>((resolve, reject) => {
      this.alexaRemote.httpsGetCall(
        '/nexus/v1/graphql',
        (err, body) => {
          if (err) {
            return reject(err);
          } else {
            return resolve(body as GetDevicesResponse);
          }
        },
        {
          data: JSON.stringify({
            query: `
              query CustomerSmartHome {
                endpoints(
                  endpointsQueryParams: { paginationParams: { disablePagination: true } }
                ) {
                  items {
                    id
                    friendlyName
                    enablement
                    displayCategories {
                      primary {
                        value
                      }
                    }
                    features {
                      name
                      operations {
                        name
                      }
                    }
                  }
                }
              }`,
          }),
        },
      );
    });
  }
}
