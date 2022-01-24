# homebridge-smooth-lock
[![NPM Version](https://img.shields.io/npm/v/homebridge-smooth-lock.svg)](https://www.npmjs.com/package/homebridge-smooth-lock)

## Description

This [Homebridge](https://github.com/homebridge/homebridge) plugin exposes a web-based lock to Apple's [HomeKit](http://www.apple.com/ios/home/). This plugin expects the lock to expose a specific REST API to allow Homebridge to lock and unlock the device. It also expects that once the lock completes the requested action, it will inform a Homebridge "listener" which will then inform HomeKit of the locks new state.

## Motivation

We built a lock for our sliding door with a microcontroller and wanted to be able to control it with HomeKit. Homebridge looked like the best bet, but we wanted a lock plugin that could allow our microcontroller to handle the auto-lock delay (so that it could be sensitive to whether or not the door was open). We also wanted to include a one-time token in each transaction between Homebridge and the device so that lock would not accept instructions from an unknown source. We don't believe in security-by-firewall, we believe that we should not trust even our home network.

This plugin allows either the plugin or the device to manage automatically re-securing the lock after a delay. It also facilitates the delivery of a one-time token with each call to the device, and provides a validator so that the device can check that the token is authentic before changing the state of the lock.

## Installation

1. Install [Homebridge](https://github.com/homebridge/homebridge#installation)
2. Install this plugin in a directory on the same server
3. Use `sudo npm link` to link that installation to your Node package manager
4. Update your `config.json`

Note, once we have a real NPM package available we should simplify this installation procedure.

## Configuration

The configuration of each accessory using this plugin is done by directly editing a bit of JSON in the Homebridge application. The configuration will look something like this.

```json
"accessories": [
     {
       "accessory": "SmoothLock",
       "name": "Smooth Lock",
       "deviceRoot": "http://host.org:port/path",
     }
]
```
### Core configuration

None of these core items have default values, so you must define them in the configuration.

| Key          | Description                    |
| ------------ | ------------------------------ |
| `accessory`  | Must be `SmoothLock`           |
| `name`       | Name to appear in the Home app |
| `deviceRoot` | Root URL of your device        |

### Optional configuration

Each of these optional items either has a default value or is not necessary to the operation of the plugin. Of course, you may override any of these default values.

| Key             | Description                                                                                                | Default    |
| --------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| `listenerPort`  | Port for your HTTP listener (only one listener per port)                                                   | `8282`     |
| `autolock`      | Whether autolocking is handled by this plugin (`plugin`), by the device (`device`), or not at all (`none`) | `none`     |
| `autolockDelay` | Time (in seconds) to delay autolock if either the plugin or device is autolocking                          | `300`      |
| `pollInterval`  | Time (in seconds) between device polls                                                                     | `300`      |
| `timeout`       | Time (in seconds) until the accessory will be marked as _Not Responding_ if it is unreachable              | `3`        |
| `method`        | HTTP method used to communicate with the device                                                            | `GET`      |
| `username`      | Username if HTTP authentication is enabled                                                                 | N/A        |
| `password`      | Password if HTTP authentication is enabled                                                                 | N/A        |
| `model`         | Appears under the _Model_ field for the accessory                                                          | plugin     |
| `serial`        | Appears under the _Serial_ field for the accessory                                                         | deviceRoot |
| `manufacturer`  | Appears under the _Manufacturer_ field for the accessory                                                   | author     |
| `firmware`      | Appears under the _Firmware_ field for the accessory                                                       | version    |
| `tokenTimeout`  | Time (seconds) until a validation token becomes invalid, use `0` to ignore validation tokens               | `2`        |

## Device API

The device is the microcontroller managing the lock itself. We expect that this device is on the network and running a web server capable of responding to the following REST requests.

### Status
```
/status?token=RANDOM_STRING
```

Asks the device to report its locked or unlocked state. The device will respond with JSON describing both the target lock state and the current lock state where `1` means secured, a `0` means unsecured.

```
{
  "target": 1,
  "current": 1
}
```

### Lock

```
/lock?token=RANDOM_STRING
```

Asks the device to secure itself. The response will be ignored. The `token` value will be one that the listener is prepared to validate with a `/validate` call.

Note that once the lock is confirmed to be secured, the device should send the listener a `/locked` call.

### Unlock

```
/unlock?token=RANDOM_STRING&auto=INTEGER
```

Asks the device to unsecure itself. The response will be ignored. The `token` value will be one that the listener is prepared to validate with a `/validate` call. If the configuration specifies that the device is managing the `autolock` timing itself, then the desired delay will be included as seconds in the `auto` value.

Note that once the lock is confirmed to be unsecured, the device should send the listener an `/unlocked` call.

## Listener API

The listener will be set up by this plugin using the Homebridge's own host name and the `listenerPort` supplied in the configuration. You will have to configure your device to communicate with this specific listener. The listener server responds to the following REST requests.

### Locked

```
/locked
```

Informs the Homebridge listener that the device has been successfully locked.

### Unlocked

```
/unlocked
```

Informs the Homebridge listener that the device has been successfully unlocked.

### Validate

```
/validate?token=STRING
```

Asks the Homebridge listener to validate a token. The listener will respond with 1 if the token was valid or 0 if the token was invalid. This token should be the same token that the device received with the calls to its own API. The listener will respond `valid` if the token is valid, any other response should be considered invalid.

Note that if the `tokenTimeout` supplied in the configuration is set to `0` (zero), then any string you try to validate will be accepted as valid. This effectively breaks security, but can make certain testing easier.

## Changelog

### 1.0.1 - January 2022

Add NPM shield to readme.

### 1.0.0

Initial version. This plugin owes a lot to [homebridge-web-lock](https://github.com/phenotypic/homebridge-web-lock). While we made quite a few changes, that plugin showed us how all this fits together and works.
