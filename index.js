var crypto = require('crypto'),
	url = require('url'),
	request = require('request'),
	queryString = require('querystring'),
	http = require('http'),
	nonce = require('nonce')(8),
	extend = require('extend');

function JwPlatformApi(config, logger) {
	this.config = config || {};

	if (!this.config.key) {
		throw new Error('Must provide a jwPlatform key in config.key');
	}
	if (!this.config.secret) {
		throw new Error('Must provide a jwPlatform secret in config.secret');
	}

	this.config.protocol = this.config.protocol || 'http';
	this.config.baseUrl = this.config.baseUrl || 'api.jwplatform.com';

	this.log = logger || {
		debug: function(message) {
			console.log(message);
		},
		error: function(message) {
			console.error(message);
		}
	};

	if (typeof(logger) === 'function') {
		var logFunction = logger;
		logger = {};
		['debug', 'error'].forEach(function(level) {
			logger[level] = logFunction;
		});
	}
}

JwPlatformApi.prototype = {
	getParams: function(params, body) {
		var defaultParams = {
			api_format: 'json',
			api_key: this.config.key,
			api_nonce: nonce(),
			api_timestamp: Math.floor(Date.now() / 1000)
		};

		params = extend(defaultParams, params || {});
		var allParams = extend(params, body || {});

		var sortedParams = {};
		Object.keys(allParams).sort().forEach(function(key) {
			sortedParams[key] = allParams[key];
		});

		var input = queryString.stringify(sortedParams);

		params.api_signature = crypto.createHash('sha1')
			.update(input + this.config.secret, 'utf8')
			.digest('hex');

		return params;
	},

	generateUrl: function(path, params, body) {
		return url.format({
			hostname: this.config.baseUrl,
			protocol: this.config.protocol,
			query: this.getParams(params, body),
			pathname: path
		});
	},

	sendRequest: function(method, apiUrl, body, parseJson, callback) {
		method = method.toLowerCase();

		var self = this,
			args = [ apiUrl ];

		function responseHandler(err, res, body) {
			if (err) {
				self.log.error(err);
				callback(err);
				return;
			}

			if (!parseJson) {
				callback(err, body);
				return;
			}

			try {
				var result = JSON.parse(body);
				if (result.status !== 'ok') {
					self.log.error(result);
					callback(result);
					return;
				}

				callback(null, result);
			} catch (e) {
				self.log.error(e);
				callback(e);
			}
		}

		if (method === 'get') {
			args.push(responseHandler);
		} else {
			args.push({ form: body }, responseHandler);
		}

		this.log.debug('jwPlatform request: ' + method.toUpperCase() + ' ' + apiUrl);

		var r = request[method];
		r.apply(r, args);
	},

	get: function(path, params, callback) {
		this.sendRequest('get', this.generateUrl(path, params), null, true, callback);
	},
	post: function(path, params, body, callback) {
		this.sendRequest('post', this.generateUrl(path, params, body), body, true, callback);
	},

	updateTemplate: function(version, params, callback) {
		this.post(version + '/accounts/templates/update', null, params, callback);
	},

	createTemplate: function(version, params, callback) {
		this.post(version + '/accounts/templates/create', null, params, callback);
	},

	getUploadUrl: function(version, callback) {
		this.get(version + '/videos/create', null, function(err, body) {
			if (err) {
				callback(err);
				return;
			}

			var link = body.link;

			var result = {
				uploadUrl: url.format({
					protocol: link.protocol,
					hostname: link.address,
					pathname: link.path,
					query: {
						api_format: 'json',
						key: link.query.key,
						token: link.query.token
					}
				}),
				progressUrl: url.format({
					protocol: link.protocol,
					hostname: link.address,
					pathname: 'progress',
					query: {
						token: link.query.token ,
						key: link.query.key
					}
				})
			};

			callback(null, result);
		});
	},

	getTemplates: function(version, callback) {
		this.get(version + '/accounts/templates/list', null, callback);
	},

	getVideoData: function(version, videoKey, callback) {
		this.get(version + '/videos/conversions/list', { video_key: videoKey }, function(err, body) {
			if (err) {
				callback(err);
				return;
			}

			var conversions = body.conversions;

			var result = {
				completed: conversions.reduce(function (cur, next) {
					return cur + (next.status === 'Ready');
				}, 0),
				total: body.total,
				videos: conversions.map(function (conversion) {
					return {
						status: conversion.status.toLowerCase(),
						key: conversion.key,
						width: conversion.width,
						height: conversion.height,
						size: Number(conversion.filesize),
						duration: Number(conversion.duration),
						url: conversion.link && url.format({
							protocol: conversion.link.protocol,
							hostname: conversion.link.address,
							pathname: conversion.link.path
						})
					};
				})
			};

			//the original video shows up initially before the others have been queued
			result.ready = body.total > 1 && result.completed === body.total;
			callback(null, result);
		});
	}
};

module.exports = JwPlatformApi;
