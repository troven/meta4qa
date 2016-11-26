#!/usr/bin/env node

var _ = require('lodash');
var assert = require("assert");
var debug = require('debug')('meta4qa');

var self = module.exports = _.extend({
    _: _,
    debug: function(name) { return debug("meta4qb:"+name) },
    Runtime: require("./Runtime"),
    Feature: require("./runtime/MochaFeatureRunner"),
    Dialect: require("./Dialect"),
    Engine: require("./Engine"),
    Logger: require("./Logger"),
    helpers: require("./helpers"),
    defaults: require("./defaults"),
    converts: require('./converter'),
    docs: __dirname+"/../docs/js",
    configure: require("./Configure"),
    cli: require("./cli"),

    auto: function(config) {
        var meta4qa = new self.Runtime();
        assert(meta4qa, "meta4qa not auto-created");

        if (require.main === module) {
            meta4qa.init(config || self.cli);
            assert(meta4qa.config, "meta4qa not auto-configured");
            debug("meta4qa: "+meta4qa.config.name);

            // ran from command line
            debug("running: "+self.helpers.pkg.name);
            meta4qa.execute();
	
        }
        return meta4qa;
    }
}, require("events"));
