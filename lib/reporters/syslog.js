var _ = require('underscore');
var assert = require("assert");
var request = require("request");

module.exports = function(runner, config, options) {
    assert(runner, "Missing Runner");
    assert(config, "Missing Config");

    options = options || config.syslog || {};

    if (!options) {
        return;
    }
    var payload = _.extend({},options.vars);

    // return {
    //     started: function() {
    //         var msg = _.extend({}, payload);
    //         msg.text = "Test Success";
    //         console.log("SYSLOG: %s -> %j -> %j", msg.text, msg, arguments);
    //         return msg;
    //
    //     },
    //     success: function() {
    //         var msg = _.extend({}, payload);
    //         msg.text = "Test Success";
    //
    //         console.log("SYSLOG: %s -> %j -> %j", msg.text, msg, arguments);
    //         return msg;
    //     },
    //     failure: function() {
    //         var msg = _.extend({}, payload);
    //         msg.text = "Test Failed";
    //
    //         console.log("SYSLOG: %s -> %j -> %j", msg.text, msg, arguments);
    //         return msg;
    //     },
    //     finished: function() {
    //         var msg = _.extend({}, payload);
    //         msg.text = "Test Finished";
    //
    //         console.log("SYSLOG: %s -> %j -> %j", msg.text, msg, arguments);
    //         return msg;
    //     },
    //
    // };
}