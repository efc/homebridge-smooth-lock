// homebridge-smooth-lock/index.js
const packageJson = require('./package.json')
const request = require('request')
const ip = require('ip')
const http = require('http')

module.exports = (api) => {
	api.registerAccessory('SmoothLock', SmoothLock);
};

class SmoothLock {

	constructor(log, config, api) {
		this.log = log;
		this.config = config;
		this.api = api;

		this.Service = this.api.hap.Service;
		this.Characteristic = this.api.hap.Characteristic;

		// extract settings from config
		this.name = config.name
		this.deviceRoot = config.deviceRoot
		this.pollInterval = config.pollInterval || 300

		this.listenerPort = config.listenerPort || 2000
		this.requestArray = ['lock', 'unlock', 'validate']

		this.autolock = config.autolock || 'none'
		this.autoTimeout = 300

		this.manufacturer = config.manufacturer || packageJson.author
		this.serial = config.serial || packageJson.version
		this.model = config.model || packageJson.name
		this.firmware = config.firmware || packageJson.version

		this.username = config.username || null
		this.password = config.password || null
		this.timeout = config.timeout || 3000
		this.method = config.method || 'GET'
		this.tokenTimeout = config.tokenTimeout === 0 ? 0 : (config.tokenTimeout || 2000)

		if (this.username != null && this.password != null) {
			this.auth = {
				user: this.username,
				pass: this.password
			}
		}

		// create a dictionary to hold our validation tokens
		this.tokens = {}

		// create the listener server
		this.server = http.createServer(function (request, response) {
			var baseURL = 'http://' + request.headers.host + '/'
			var url = new URL(request.url, baseURL)
			if (this.requestArray.includes(url.pathname.substr(1))) {
				this.log.debug('Handling request: %s', request.url)
				response.end(this.handleListenerRequest(url))
			} else {
				this.log.warn('Invalid request: %s', request.url)
				response.end('Invalid request')
			}
		}.bind(this))

		this.server.listen(this.port, function () {
			this.log('Listen server: http://%s:%s', ip.address(), this.port)
		}.bind(this))

		// create a new Lock Mechanism service
		this.service = new this.Service.LockMechanism(this.name)

		// create handlers for required characteristics
		this.service.getCharacteristic(this.Characteristic.LockTargetState)
			.onSet(this.handleSetTarget.bind(this))

		if (this.autolock === 'device' || this.autolock === 'homebridge') {
			this.service.getCharacteristic(this.Characteristic.LockManagementAutoSecurityTimeout)
				.onGet(this.handleGetAutoTimeout.bind(this))
				.onSet(this.handleSetAutoTimeout.bind(this))
		}

		this.informationService = new this.Service.AccessoryInformation()
		this.informationService
			.setCharacteristic(this.Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(this.Characteristic.Model, this.model)
			.setCharacteristic(this.Characteristic.SerialNumber, this.serial)
			.setCharacteristic(this.Characteristic.FirmwareRevision, this.firmware)

		// get the initial status and set up regular status retrievals
		this.getStatus(function () { })

		setInterval(function () {
			this.getStatus(function () { })
		}.bind(this), this.pollInterval * 1000)

	}

	freshToken() {
		const token = Math.random().toString(16).substr(2, 8)
		const now = Date.now()
		this.tokens[token] = now
		return token
	}

	isValidToken(token) {
		const created = this.tokens[token]
		delete this.tokens[token]
		return (created && ((created + this.tokenTimeout) < Date.now()))
	}

	startAutolockTimer() {

	}

	handleListenerRequest(url) {
		const route = url.pathname.substr(1)
		switch (route) {
			case 'locked':
				this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(this.Characteristic.LockCurrentState.SECURED)
				this.log('Updated current to locked')
				return ('Homebridge updated')
			case 'unlocked':
				this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(this.Characteristic.LockCurrentState.UNSECURED)
				this.log('Updated current to unlocked')
				if (this.autolock === 'homebridge') {
					this.startAutolockTimer()
				}
				return ('Homebridge updated')
			case 'validate':
				if (this.tokenTimeout) {
					const token = url.searchParams.get('token')
					if (token) {
						if (!this.isValidToken(token)) {
							return ('invalid token')
						}
					} else {
						return ('missing token')
					}
				}
				return ('valid')
		}
		this.log.warn('Unknown route "%s"', route)
		return ('Unknown route "%s"', route)
	}

	httpRequest(url, body, method, callback) {
		request({
			url: url,
			body: body,
			method: this.method,
			timeout: this.timeout,
			rejectUnauthorized: false,
			auth: this.auth
		}, function (error, response, body) {
			callback(error, response, body)
		})
	}

	getStatus(callback) {
		var url = this.deviceRoot + '/status'
		this.log.debug('Getting status: %s', url)
		this.httpRequest(url, '', 'GET', function (error, response, responseBody) {
			if (error) {
				this.log.warn('Error getting status: %s', error.message)
				this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(new Error('Error getting status'))
				callback(error)
			} else {
				this.log.debug('Device response: %s', responseBody)
				try {
					var json = JSON.parse(responseBody)
					this.service.getCharacteristic(this.Characteristic.LockCurrentState).updateValue(json.current == 1 ? this.Characteristic.LockCurrentState.SECURED : this.Characteristic.LockCurrentState.UNSECURED)
					this.log.debug('Updated current state to: %s', json.current)
					this.service.getCharacteristic(this.Characteristic.LockTargetState).updateValue(json.target == 1 ? this.Characteristic.LockTargetState.SECURED : this.Characteristic.LockTargetState.UNSECURED)
					this.log.debug('Updated target state to: %s', json.target)
					callback()
				} catch (e) {
					this.log.warn('Error parsing status response: %s', e.message)
				}
			}
		}.bind(this))
	}

	handleSetTarget(value) {
		const route = value ? '/lock' : '/unlock'
		const token = this.freshToken()
		var auto = ''
		if (route === '/unlock' && this.autolock === 'device') {
			auto = '&auto=300'
		}
		const url = this.deviceRoot + route + '?token=' + token + auto
		this.log.debug('Sending: %s', url)
		this._httpRequest(url, '', this.method, function (error, response, responseBody) {
			if (error) {
				this.log.warn('Error sending %s: %s', url, error.message)
				callback(error)
			} else {
				this.log('Sent %s', url)
				callback()
			}
		}.bind(this))
	}

	handleGetAutoTimeout() {
		this.log('Getting auto timeout (not really)')
		return (this.autoTimeout)
	}

	handleSetAutoTimeout(seconds) {
		this.log('Setting auto timeout (not really)')
		this.autoTimeout = seconds
		return
	}

}