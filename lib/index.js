#!/usr/bin/env node

var _ = require('lodash');
var assert = require("assert");
var debug = require('debug')('meta4qa');
var self = module.exports = {
	_: _,
	assert: assert,
	selfTest: require("./SelfTest")(__dirname + "/features/"),
	pkg: require("../package.json"),
	debug: function (name) {
		return debug(self.pkg.name + name)
	},
	Runtime: require("./Runtime"),
	Feature: require("./runtime/MochaFeatureRunner"),
	Dialect: require("./Dialect"),
	Scope: require("./Scope"),
	Engine: require("./Engine"),
	Logger: require("./Logger"),
	helpers: require("./helpers"),
	defaults: require("./defaults"),
	converts: require('./converter'),
	docs: __dirname + "/../docs/js",
	configure: require("./Configure"),
	cli: require("./cli"),
	auto: function () {

		if (require.main === module) {

            self.cli.name = "meta4qa";
            self.cli.features = self.cli.features || "./features";

            var config = self.configure(self.cli, self.cli.config || "qa.json");
			var meta4qa = new self.Runtime(config);

			assert(meta4qa, "meta4qa not auto-created");

            meta4qa.config.paths = _.extend({}, meta4qa.config.paths);
            meta4qa.config.name = self.pkg.name;
            meta4qa.config.reporter = meta4qa.config.reporter || "spec";

			assert(meta4qa.config, "meta4qa not auto-configured");
			debug("meta4qa: " + meta4qa.config.name);

			// ran from command line
			debug("running: " + self.helpers.pkg.name);

// if no built-in commands gobbled us, run ./features
            if (!meta4qa.commands(self.cli)) {
                meta4qa.execute();
            }

			return meta4qa;
		}

		return this;
	}
};

self.auto();

return self;
