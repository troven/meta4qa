#!/usr/bin/env node

var _ = require('lodash');
var assert = require("assert");
var async = require("async");
var debug = require('debug')('meta4qa:runtime');
var error = require('debug')('meta4qa:err');
var mkdirp = require("mkdirp");
var fs = require("fs");

var Feature = require("./runtime").Mocha;
var Dialect = require("./Dialect");
var Engine = require("./Engine");
var Configure = require("./Configure");
var defaults = require("./defaults");
var helpers = require("./helpers");
var Logger = require("./Logger");

module.exports = function(config) {

    var _config = config;
    var self = this;

    self.init = function(config) {
        assert(config, "Missing Config");

        self.config = Configure(config);
        self.dialect = new Dialect(self.config);
        // Additional Vocabularies

        if (self.config.vocab) {
            self.dialect.learn(__dirname + "/../" + self.config.vocab);
        }

        if (process.env.meta4qa_DIALECTS) {
            self.dialect.learn(process.env.meta4qa_DIALECTS);
        }

        this.logger = Logger(self.config);

        return self;
    };

    self.commands = function(cli) {
        assert(cli, "Missing CLI");
        assert(self.config, "Not initalized");
        assert(self.config.repeat, "Not repeating");
        var config = self.config;

        // Knowledge Transfer

        if (cli.knows) {

            var knows = self.dialect.knows();
            _.each(knows, function(phrases, verb) {
                console.log(verb.toUpperCase());
                _.each(phrases, function(phrase) {
                    console.log("\t"+phrase.toString().replace(/\n/g, "..."));
                })
            });
            return true;
        }

        // initialize / write example files

        if ( cli.example) {
            return self.examples();
        } else if (cli.initialize) {
            return self.initialize();
        }

        // return a JSON object of the parsed features
        if (cli.audit) {
            var audit = self.dialect.audit(self.config.featuresPath);
            console.log("%j", audit);
            return true;
        }

        // warn if no explict ./features folder
        if (!helpers.files.exists(self.config.featuresPath)) {
            console.log("missing "+self.config.featuresPath+" folder. Create it manually or use the --initialize or --example options");
            return true;
        }

        return false;
    };

    self.execute = function(config, onComplete) {
        if (_.isFunction(config)) {
            config = {};
            onComplete = config;
        }
        onComplete = onComplete || self.onComplete;

        assert(onComplete, "Missing onComplete");

        assert(self.config.featuresPath, "Missing Feature Path");
        assert(self.config.repeat, "Missing Repeat Count");

        debug("paths: %j", self.config.paths);
        // self.config.reporter = self.config.archive?"simple":self.config.reporter;

        // run them
        var runs = [];
        async.times(self.config.repeat, function (n, next) {
            config = _.extend({ vars: {} }, self.config, config);
            config.vars = _.extend({}, config.vars);

            var engine = new Engine(config);

            // load the features - callback the engine.feature to bind them
            self.dialect.load(config.featuresPath, engine.onFeature);

            // execute ...
            debug("Running #%s/%s  @ %s", (n+1), config.repeat, config.featuresPath);

            engine.run(function (results) {
                results.seq = (runs.length)+1;
                debug("Run Done (#%s): %j", results.seq, results.stats);
                runs.push(results);
                next();
            });
        }, function(x) {
            // console.log("Runtime complete: %j", runs);
            onComplete & onComplete(runs);
        });
        return runs;
    };

    self.engine = function(config, feature$) {
        assert(config, "Missing config");
        assert(feature$, "Missing feature");


        var engine = new Engine(config);
        self.dialect.parseRaw(feature$, engine.onFeature);
        return engine;
    };

    self.initialize = function() {
        mkdirp(self.config.featuresPath);
        helpers.build.json(self.config.configFile, self.safeConfig() );
        console.log("Created ./%s and %s", self.config.configFile, self.config.featuresPath);
        return true;
    };

    self.safeConfig = function(config) {
        return _.omit( config || self.config, defaults.PROTECTED_CONFIG );
    };

    self.examples = function(from) {
        self.initialize();
        var from = (from||__dirname+"/../features");
        helpers.build.copy(from, self.config.featuresPath);
        console.log("Created Examples in: %s", self.config.configFile, self.config.featuresPath);
        return true;
    };

    self.archive = function(path, results) {
        assert(path, "Missing path");
        assert(results, "Missing results");
        // assert(feature, "Missing feature");

        var archiveDir = path+ "/" + (_config.repeat > 1 ? _.now()+"/" : "");
        results.config = self.safeConfig();
//        results.feature = feature || {};

        mkdirp.sync(archiveDir);
        var filename = archiveDir +_.now()+ ".json";

        try {
            fs.writeFileSync(filename, JSON.stringify(results, null, "\t"));
            debug("Archived: %s items -> %s", results.length, filename);
        } catch(e) {
            error("Archive Failed: %s",e);
        }
    };

    self.onComplete = function (results) {
        if (self.config.archive) {
            // save results, config and parsed features to file
            self.archive(self.config.archive, results);
        }

        // TODO: SVT (--repeat) do not exist cleanly

        // only exit with status code when running once -
        if (!self.config.noExit && self.config.repeat==1) {
            debug("onComplete: " + results[0].stats.failures + " failed");
            process.exit(results[0].stats.failures);
        } else {
            var memo = _.reduce(results, function(memo, result) { return memo+=result.stats.failures }, 0)
            debug("onComplete: %s with %s failed", self.config.repeat, memo);
        }
        return this;
    };

    if (_config) {
        this.init(_config);
    }

};

