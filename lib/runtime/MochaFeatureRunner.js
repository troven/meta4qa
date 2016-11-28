var Events = require('events');
var Mocha = require("mocha");
var assert = require("assert");
var async = require("async");
var _ = require('underscore');
var debug = require('debug')('meta4qa:feature');
var Promise = require("promise");

/*


 */
module.exports = function(dialect, feature, scope) {
    assert(dialect, "Missing dialect");
    assert(dialect.execute, "Dialect can't execute");
    assert(feature, "Missing Feature:");
    assert(feature.title, "Missing Feature: title");
    assert(scope, "Missing scope");
    assert(scope.emit, "Invalid scope");

    var self = this;
    var pass = Promise.resolve(true);
    var fail = Promise.reject(new Error("Feature Fail"));

    self.story = function(scenario, scope) {
        assert(scenario, "Missing Scenario:");
        assert(scenario.title, "Missing a Scenario: title");
        assert(scope, "Missing scope");

        dialect.scenarios(scope);

        //debug("Story: %j", scope);
        var story = new Mocha.Test(scenario.title, function (done) {
            scope.emit("story start", story, scenario);
            debug(scenario.title);

            dialect.annotations(scenario.annotations, scope, story);

            // run each step synchronously
            var i = 1;
            async.eachSeries(scenario.steps, function (step, stepDone) {
                debug("%s) %s", i++, step);
                dialect.execute(step, scope, stepDone);
                scope.emit("story step", step, story, scenario);
            }, function () {
                scope.emit("story done", story, scenario);
                done();
            })

            return pass;
        });

        story.featureTitle = feature.title;

        story.fullTitle = function () {
            return feature.title+": "+scenario.title;
        };

        debug(scenario.title+" has "+scenario.steps.length+" steps" );
        return story;
    }

    self.scope = function(_scope) {
        var vars = _.extend({}, scope, _scope);
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

            var _scope = self.scope({ name: "feature" });
            dialect.features(_scope);

            if (!dialect.noop(scenario.annotations)) {

                var story = self.story(scenario, _scope);
                suite.addTest(story);
                scope.emit("story", story, scenario);
            } else {
                scope.emit("story skip", scenario);
            }

        });
        return suite;
    }
}