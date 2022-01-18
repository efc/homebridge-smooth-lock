# homebridge-smooth-lock

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

```json
"accessories": [
     {
       "accessory": "SmoothLock",
       "name": "Smooth Lock",
       "deviceRoot": "http://host.org:port/path",
     }
]
```
### Core
| Key          | Description                    | Default |
| ------------ | ------------------------------ | ------- |
| `accessory`  | Must be `SmoothLock`           | N/A     |
| `name`       | Name to appear in the Home app | N/A     |
| `deviceRoot` | Root URL of your device        | N/A     |

### Optional fields
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
