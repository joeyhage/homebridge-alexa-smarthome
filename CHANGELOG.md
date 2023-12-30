# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

See the [roadmap](https://homebridge-alexa-smarthome.canny.io/) for up-to-date, unreleased work in progress.

## [2.0.6] - 2023-12-29

### Added

- Alexa Echo devices with temperature sensors now report temperature to HomeKit.

## [2.0.5] - 2023-12-27

### Fixed

- Fixed a bug introduced in 2.0.4 for set thermostat mode.

## [2.0.4] - 2023-12-08

### Added

- Support for set thermostat mode.
- Support for vacuum cleaners.

## [2.0.3] - 2023-11-28

### Added

- Added missing Amazon domains `amazon.in` and `amazon.nl`.

## [2.0.2] - 2023-10-19

### Changed

- Switches that support changing brightness will now appear in HomeKit as light bulbs so that brightness can be controlled from HomeKit.

## [2.0.1] - 2023-10-11

### Changed

- Increased Alexa API timeouts for requests to get device list and get device states.

## [2.0.0] - 2023-10-07

### Added

- Logging for Alexa login process when debug enabled

### Changed

- Upgrade dependencies: alexa-remote2@6.1.2. Node.js 16 is now the minimum required Node.js version.

## [1.0.3] - 2023-09-25

### Added

- Support for smart locks. Only tested with Schlage Encode so far.

## [1.0.2] - 2023-09-16

### Added

- When plugin debug setting is enabled, all device names and types connected to the current Alexa account will be printed in the Homebridge logs.

## [1.0.1] - 2023-09-13

### Changed

- A minimum `device state cache lifetime (cacheTTL)` is now enforced when `refresh device states automatically in the background (backgroundRefresh)` setting is enabled. Automatic refresh will occur every 60 seconds or less frequently as configured. This is to avoid flooding Amazon with request which could result in Homebridge issues and/or Alexa account issues.

## [1.0.0] - 2023-09-13

### Added

- Support for air quality monitors. Includes overall air quality, particulate matter density, VOC density, Carbon Monoxide levels, humidity, and temperature. Only tested with Amazon Air Quality Monitor as of now.

### Changed

- Automatically remove stored Alexa authentication cookie if a `401 Unauthenticated` error occurs on startup. You may need to restart Homebridge to retry the login step.
- Remove `http://` or `https://` from `clientHost` setting if found since these will cause login issues.

## [0.2.1] - 2023-09-11

### Added

- Support for switches. Currently, changing the power and brightness are supported.

## [0.2.0] - 2023-09-08

### Added

- Support Echo smart speaker and smart display devices. Currently, Echo support includes play, pause, next track, previous track, and changing volume. See [Echo device features](https://github.com/joeyhage/homebridge-alexa-smarthome#echo-devices) for instructions.

## [0.1.2] - 2023-09-06

### Fixed

- Thermostats now show correct temperatures when thermostat mode is set to 'AUTO'.

## [0.1.1] - 2023-09-01

### Changed

- Device state cache duration and background refresh can be customized to improve plugin performance and help with 'This plugin slows down Homebridge' messages in the Homebridge logs.

## [0.1.0] - 2023-08-30

### Added

- Support thermostat devices. This includes viewing the current temperature, the set temperature(s), and the mode (OFF, AUTO, COOL, HEAT). Changing the set temperature(s) is also supported.

## [0.0.19] - 2023-08-30

### Fixed

- Handle bad response from Alexa get devices api.

## [0.0.18] - 2023-08-29

### Fixed

- Only create Homebridge accessories for Alexa devices with valid identifiers.

## [0.0.17] - 2023-08-26

### Fixed

- Fixed bug introduced in v0.0.16 with device status caching causing incorrect state to appear in HomeKit.

## [0.0.16] - 2023-08-25

### Added

- Device states are now cached for 30 seconds to reduce unnecessary requests to the Alexa API.

### Changed

- Homebridge Accessory identifiers are generated differently now. Previously, an accessory would not update if a plug was changed to be a light in the Alexa app. This may cause existing devices to be removed and re-added which may break any existing HomeKit automations for those devices.

## [0.0.15] - 2023-08-23

### Added

- Support for outlets i.e. smart plugs.

[unreleased]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.6...HEAD
[2.0.6]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.5...v2.0.6
[2.0.5]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.0.3...v2.0.0
[1.0.3]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.2.1...v1.0.0
[0.2.1]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.19...v0.1.0
[0.0.19]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.18...v0.0.19
[0.0.18]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.17...v0.0.18
[0.0.17]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.16...v0.0.17
[0.0.16]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.15...v0.0.16
[0.0.15]: https://github.com/joeyhage/homebridge-spotify-speaker/releases/tag/v0.0.15
