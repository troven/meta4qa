var error = require('debug')('meta4qa:scope');
var assert = require("assert");
var _ = require('lodash');

var Events = require('events');

module.exports = function(_defaults, _config) {

    _.extend(this, require("./defaults"), _defaults, _config, new Events.EventEmitter());

    return this;
};