var assert = require("assert");
var Mocha = require("mocha");
var Feature = require("./runtime/MochaFeatureRunner");
var SimpleReporter = require("./reporters/Simple");
var debug = require('debug')('meta4qa:engine');

var _ = require('lodash');

module.exports = function(features, config) {

    this._features = features;

    this.getFeatures = function() {
        return this._features;
    }

}
