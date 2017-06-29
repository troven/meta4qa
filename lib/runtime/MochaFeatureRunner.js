var Events = require('events');
var Mocha = require("mocha");
var assert = require("assert");
var async = require("async");
var _ = require('lodash');
var debug = require('debug')('meta4qa:mocha');
var Promise = require("promise");
var helps = require('../helpers'), vars = helps.vars, files = helps.files;

var StepError = function(step, message, meta) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = step + "\n" + message;
    this.meta = meta;
//    this.stack = [ this.stack[0], this.stack[1] ];
};


module.exports = function(dialect, feature, scope) {
    assert(dialect, "Missing dialect");
    assert(dialect.execute, "Dialect can't execute");
    assert(dialect.scope && dialect.scope.emit, "Invalid dialect");
    assert(feature, "Missing Feature:");
    assert(feature.title, "Missing Feature: title");
    assert(scope, "Missing scope");

    var self = this;
    // var pass = Promise.resolve(true);
    // var fail = Promise.reject(new Error("Feature Fail"));

    self.context = function() {
        return { scope: scope, feature: feature };
    }

    self.story = function(scenario, scope) {
        assert(scenario, "Missing Scenario:");
        assert(scenario.title, "Missing a Scenario: title");
        assert(scope, "Missing scope");

        dialect.scenarios(scope);

        //debug("Story: %j", scope);
        var story = new Mocha.Test(scenario.title, function (done) {
            dialect.scope.emit("story start", story, scenario);
            debug("Scenario: %j -> %s", scenario.title);


            dialect.annotations(scenario.annotations, scope, story);
                // run each step synchronously
                var i = 1;
                var failed = false;
                async.eachSeries(scenario.steps, function (step, stepDone) {
                    var phrase = vars.$(step, scope.vars);
                    debug("%s) %s", i++, phrase);
                    if (!failed) {
                        dialect.execute(phrase, scope, function(err, result) {
                            if (err) {
                                throw err;
//                            throw new StepError(phrase, err.message, result)
                            } else {
                                stepDone();
                                dialect.scope.emit("story step", step, story, scenario);
                            }
                        });
                    }
                }, function () {
                    dialect.scope.emit("story done", story, scenario);
                    done();
                })

//            return pass;
        });

        story.feature = feature;
        story.featureTitle = feature.title;

        story.fullTitle = function () {
            return feature.title+": "+scenario.title;
        };

        debug(scenario.title+" has "+scenario.steps.length+" steps" );
        return story;
    }

    self.scope = function(_scope) {
        var vars = _.extend({}, dialect.scope, _scope);
//        vars.vars = _.extend({}, _scope.vars, scope.vars);
        return vars;
    }

    self.feature = function (suite) {
        assert(suite, "Missing feature suite");
        assert(suite.addTest, "Invalid Mocha Suite");

        if (dialect.noop(feature.annotations)) return suite;
        suite.title = feature.title;

        //debug("Feature 2: %j", scope);

        dialect.annotations(feature.annotations, scope, suite);

        debug(feature.title+" has "+feature.scenarios.length+" scenarios" );

        _.each(feature.scenarios, function (scenario) {

            var _scope = self.scope({ name: "feature", feature: feature.title });
            dialect.features(_scope);

            if (!dialect.noop(scenario.annotations)) {

                var story = self.story(scenario, _scope);
                suite.addTest(story);
                dialect.scope.emit("story", story, scenario);
            } else {
                dialect.scope.emit("story skip", scenario);
            }

        });
        return suite;
    }
}