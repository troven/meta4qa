var assert = require("assert");
var Mocha = require("mocha");
var Feature = require("./runtime/MochaFeatureRunner");
var SimpleReporter = require("./reporters/Simple");
var debug = require('debug')('meta4qa:engine');

var _ = require('lodash');

// register custom Mocha Reporters ..
Mocha.reporters.simple = require("./reporters/Simple");

module.exports = function(config, scope) {
    assert(config, "Missing config");
    assert(config.name, "Missing Engine name");
    assert(scope, "Missing Engine scope");

    var self = this;
    self.scope = scope;

    self.suite = new Mocha.Suite(config.name+" ...");
    self.suite.timeout( config.timeout || 5000 );

    debug("Timeout: %s seconds", self.suite.timeout()/1000);

    config.reporter = config.reporter || "simple";

    self.runner = new Mocha.Runner(self.suite);
    self.runner.setMaxListeners(config.maxListeners || 20);
    self.runner.ignoreLeaks = true;     // since not all plug-ins are well-behaved - we'll be forgiving ...

    debug("mocha reporter: %s", config.reporter);
    var Reporter = _.isFunction(config.reporter)?config.reporter:Mocha.reporters[config.reporter];
//    self.reporter = new Reporter(self.runner, config);

    self.reporter = new SimpleReporter(self.runner, config);

    // Method Definitions

    this.feature = function(feature) {
        if (!feature) return self.suite();
        assert(feature.title, "Missing feature title");

        var suite = Mocha.Suite.create(self.suite, feature.title);
//        self.scope.emit("feature", feature, suite);
        dialect.annotations(feature.annotations, suite, self);
        return suite;
    }

    this.onFeature = function(dialect, feature) {
        assert(dialect, "Missing dialect");
        assert(feature, "Missing feature");
        assert(feature.title, "Missing feature title");
        assert(dialect.scope, "Missing dialect scope");

        debug("feature: "+feature.title);
        return new Feature(dialect, feature, dialect.scope).feature(self.suite);
    }

    this.run = function(done) {
        assert(done, "Missing done() callback");


        self.runner.on("start", function() {
            self.started = _.now();
            self.scope.emit("start", self);
        });

        self.runner.on("end", function() {

        });

        self.runner.on("fail", function() {
        });

        self.runner.run(function(failures) {
            self.stopped = _.now();
            self.elapsed = self.stopped - self.started;

            if (failures) {
                results = self.runner.testResults || { stats: { failures: failures, passes: 0, tests: 0 } };
                debug("Run Failed: %j", results.stats );
                self.scope.emit("failed", failures);
                done && done(results)
                return;
            }

            assert(self.runner.testResults, "Missing runner testResults");

            var results = (self.runner.testResults?self.runner.testResults: {stats: self.reporter.stats });
            results.started = self.started;
            results.stopped = self.stopped;
            results.elapsed = self.elapsed;
            results.tests = self.reporter.results.tests || [];

            results.errors = results.stats.failures?true:false;

            self.scope.emit("complete", results);
            self.runner.emit("complete", results, self);
            debug("Run Complete: "+results.stats.passes+" feature(s) in "+self.elapsed+"ms");

            done && done(results)
        });
        return self.reporter;
    }

}