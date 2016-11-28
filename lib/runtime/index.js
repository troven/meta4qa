#!/usr/bin/env node

var _ = require('underscore');
var assert = require("assert");
var debug = require('debug')('meta4qa:dialect');

var self = module.exports = {
    Mocha: require("./MochaFeatureRunner")
};
