#!/usr/bin/env node
var _ = require('lodash');
var assert = require("assert");
var debug = require('debug')('meta4qa');

var self = module.exports = {
    _: _,
    assert: assert,
    selfTest: require("./SelfTest")(__dirname+"/features/"),
    pkg: require("../package.json"),
    debug: function(name) { return debug(self.pkg.name+name) },
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
    x_auto: function(config) {
        var meta4qa = new self.Runtime(config);
        assert(meta4qa, "meta4qa not auto-created");

        if (require.main === module) {
            meta4qa.init(config || self.cli);
            assert(meta4qa.config, "meta4qa not auto-configured");
            debug("meta4qa: "+meta4qa.config.name);

            // ran from command line
            debug("running: "+self.helpers.pkg.name);
        }
        return meta4qa;
    }
};

return self;
