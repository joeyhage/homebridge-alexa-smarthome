# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

See the [roadmap](https://homebridge-alexa-smarthome.canny.io/) for up-to-date, unreleased work in progress.

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

[unreleased]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.19...v0.1.0
[0.0.19]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.18...v0.0.19
[0.0.18]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.17...v0.0.18
[0.0.17]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.16...v0.0.17
[0.0.16]: https://github.com/joeyhage/homebridge-spotify-speaker/compare/v0.0.15...v0.0.16
[0.0.15]: https://github.com/joeyhage/homebridge-spotify-speaker/releases/tag/v0.0.15