var _ = require("lodash");
var Base = require('mocha').reporters.Base;
var vars = require("../helpers/vars");
var assert = require("assert");
var debug = require('debug')("meta4qa:reporter");

exports = module.exports = SimpleReporter;

/**
 * Initialize a new `JSON` reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function SimpleReporter(runner ,config) {
    assert(runner, "Missing Runner");
    assert(config, "Missing Config");

    Base.call(this, runner);

    debug("Simple JSON Reporter");

    runner.testResults = { stats: {}, results: {} };

    var self = this;
    runner.testResults.results = self.results = { tests: [], pending: [], failures: [], passes: [] };
    self.state  = false;

    runner.on('test end', function(test) {
//        debug("test end: %j", clean(test));
    });

    runner.on('pass', function(test) {
        test.status = "pass";
        test  = clean(test);
        self.results.tests.push(test);
        self.results.passes.push(test);
        // debug("test pass: %j", _.keys(test));
    });

    runner.on('fail', function(test) {
        test.status = "fail";
        test  = clean(test);
        self.results.tests.push(test);
        self.results.failures.push(test);
//        debug("test fail: %j", clean(test));
    });

    runner.on('pending', function(test) {
        test.status = "pending";
        test  = clean(test);
        self.results.tests.push(test);
        self.results.pending.push(test);
    });

    runner.on( 'end' , function() {

        assert(self.results, "Broken");
        var r = runner.testResults = {
            title: runner.suite.title,
            stats: self.stats,
            tests: _.map(self.results.tests, clean),
            pending: _.map(self.results.pending, clean),
            failures: _.map(self.results.failures, clean),
            passes: _.map(self.results.passes,clean)
        };

        debug("End Tests: %s, Passes: %s, Fails: %s", r.tests.length, r.passes.length, r.failures.length);
        return r;
    });
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @api private
 * @param {Object} test
 * @return {Object}
 */
function clean(test) {
    var r = {
        status: test.status,
        featureTitle: test.featureTitle,
        title: test.title,
        fullTitle: function() { console.log("clean: %j", test);return test.fullTitle() },
        duration: test.duration,
        retried: test.currentRetry
    };
    if (test.err) r.err = test.err?test.err.message:""

    return r;
}
