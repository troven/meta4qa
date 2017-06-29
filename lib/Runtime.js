#!/usr/bin/env node

var _ = require('lodash');
var assert = require("assert");
var async = require("async");
var meta4qa = require('./index.js');
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

    assert(config, "Missing config");
    assert(config.name, "Missing config name");
    var featuresPath = config.paths.features = config.paths.features;
    assert(featuresPath, "Missing featuresPath");

    var self = this;

    self.init = function(config) {
        assert(config, "Missing Config");
        self.config = _.extend({ paths: { features: "./features" }}, config);

        self.dialect = new Dialect(self.config);
        self.logger = Logger(self.config);
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
            var audit = self.dialect.audit(featuresPath);
            console.log("%j", audit);
            return true;
        }

        return false;
    };

    self.dependencies = function(deps, requires) {
        var self = this;
        assert(self.dialect, "Not initialized");
        var installed = []
        deps = deps.dependencies || deps;
        _.each(deps, function(ver, dep) {
            if (dep.indexOf("meta4qa-")>=0) {
                debug("install: %s @ %s", dep, ver);
                self.dialect.learn(requires(dep),dep);
                installed.push(dep);
            }
        });
        return installed;
    },

    self.execute = function(config, onComplete) {
        var featurePath = featuresPath;

        if (! config || _.isString(config)) {
            featurePath = config || featuresPath;
            if (_.isObject(onComplete)) {
                config = _.extend({ features: featurePath }, onComplete);
            }
            onComplete = (arguments.length>1 && _.isFunction(arguments[2]) ) || false;
        }
        if (_.isFunction(config)) {
            onComplete = config;
            config = { features: featurePath };
        }

        config = _.extend({ paths: {} }, self.config, config);
        onComplete = onComplete || self.onComplete;

        assert(onComplete, "Missing onComplete");

        assert(featurePath, "Missing Feature Path");

        // warn if no explict ./features folder
        if (!helpers.files.exists(featurePath)) {
            console.log("missing "+featurePath+" folder. Create it manually or use --initialize");
            return true;
        }

        assert(self.config.repeat, "Missing Repeat Count");

        // self.config.reporter = self.config.archive?"simple":self.config.reporter;

        // run them
        var runs = [];

        debug("execute : %s", featuresPath);

        async.times(self.config.repeat, function (n, next) {
            config = _.extend({ paths: {}, vars: {} }, self.config, config);
            config.vars = _.extend({}, config.vars);
            var engine = new Engine(config, self.dialect.scope);

            // load the features - callback the engine.feature to bind them
            self.dialect.load(featurePath, engine.onFeature );
            // function(err, feature) {
            //     engine.onFeature(err, feature);
            // }
            engine.run(function (results) {
                results.seq = (runs.length)+1;
                self.dialect.scope.emit("run", results);

                debug("[ %s / %s ] tests: %s passes: %s, fails: %s, pending: %s", results.seq, self.config.repeat,
                    results.stats.tests, results.stats.passes, results.stats.failures, results.stats.pending);

                runs.push(results);
                next();
            });

        }, function() {
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
        mkdirp(featuresPath);
        helpers.build.json(self.config.configFile, self.safeConfig() );
        console.log("Created ./%s and %s", self.config.configFile, featuresPath);
        return true;
    };

    self.safeConfig = function(config) {
        return _.omit( config || self.config, defaults.PROTECTED_CONFIG );
    };

    self.examples = function(from) {
        mkdirp(featuresPath);
        var configFile = __dirname+"/../example_config.json";
        var config = helpers.files.config(configFile , self.safeConfig());
        debug("writing config: %j -> %s", self.safeConfig(), featuresPath);


        config.paths = _.extend(config.paths, { blueprints: "./blueprints", docs: "target/docs"} );
        helpers.build.json(self.config.configFile, config );

        var from = (from||__dirname+"/../examples/features");
        helpers.build.copy(from, featuresPath);

        from = __dirname+"/../examples/blueprints";
        var to = featuresPath+"/../blueprints/";
        helpers.build.copy(from, to);

        from = __dirname+"/../examples/etc";
        helpers.build.copy(from, featuresPath+"/../etc/");

        // self.execute(config, function() {
        //     console.log("Created examples in: %s", featuresPath);
        // })
        return true;
    };

    self.archive = function(path, results) {
        assert(path, "Missing path");
        assert(results, "Missing results");
        // assert(feature, "Missing feature");

        var archiveDir = path+ "/" + (config.repeat > 1 ? _.now()+"/" : "");
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
        if (!self.config.noExit && results.length>0) {
            debug("onComplete: " + results[0].stats.failures + " failed");
            process.exit(results[0].stats.failures);
        } else {
            var memo = _.reduce(results, function(memo, result) { return memo+=result.stats.failures }, 0)
            debug("onComplete: %s with %s failed", self.config.repeat, memo);
        }
        return this;
    };

    if (config) {
        this.init(config);
    }

};

