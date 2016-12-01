var debug = require('debug')('meta4qa:logger');
var _ = require('lodash');
var assert = require("assert");

var logger = require('winston');

module.exports = function(config) {

    debug("Remote logging using %j", _.keys(config.logging));

    _.each(config.logging, function(options, log_type) {
        var logsene = require('winston-'+log_type);

        if (options) {
            logger.add(logsene, _.extend({ssl: 'true', source: config.name || config.pkg.name }, options) );
            debug(log_type, "%s Activated");
        }
    })

// configure remote logging

    return logger;
}