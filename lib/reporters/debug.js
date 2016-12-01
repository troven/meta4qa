var _ = require('lodash');
var assert = require("assert");
var request = require("request");

module.exports = function(runner, config, options) {
    assert(runner, "Missing Runner");
    assert(config, "Missing Config");

    options = options || config.slack || {};

    if (!options) {
        return;
    }
    options = _.extend({ "name": "Afirrm", params: {} });

    var payload = _.extend({},options.params);

    return {
        started: function() {
            var msg = _.extend({}, payload);
            msg.text = "Test Success";
            console.log("Debug: %s -> %j -> %j", msg.text, msg, arguments);
            return msg;

        },
        success: function() {
            var msg = _.extend({}, payload);
            msg.text = "Test Success";

            console.log("Debug: %s -> %j -> %j", msg.text, msg, arguments);
            return msg;
        },
        failure: function() {
            var msg = _.extend({}, payload);
            msg.text = "Test Failed";

            console.log("Debug: %s -> %j -> %j", msg.text, msg, arguments);
            return msg;
        },
        finished: function() {
            var msg = _.extend({}, payload);
            msg.text = "Test Finished";

            console.log("Debug: %s -> %j -> %j", msg.text, msg, arguments);
            return msg;
        },

    };
}