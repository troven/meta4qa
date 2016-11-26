var assert = require('assert');
var _ = require('lodash');
var debug = require('debug')('meta4qa:afs-local');

var path = require("path");
var fs = require("fs");
var mkdirp = require("mkdirp");

var converts = require('../converter');

module.exports = {

    load: function(file) {
        return fs.readFileSync(file);
    },
    write: function(file, data) {
        fs.writeFileSync(file,data);
    },

    exists: function(file) {
        try {
            var stat = fs.statSync(file);
            return stat?true:false;
        } catch(e) {
            return false;
        }
    },

    size: function(file) {
        try {
            var stat = fs.statSync(file);
            return stat?stat.size:-1;
        } catch(e) {
            return -1;
        }
    },

    json: {
        load: function(file) {

        },
        write: function(file, data) {

        }
    },

    csv: {
        load: function(file) {

        },
        write: function(file, data) {

        }
    },

    yaml: {
        load: function(file) {

        },
        write: function(file, data) {

        }
    },

    audit: {
        load: function(file) {
            throw "Not Implemented";
        },
        write: function(file, data) {

        }
    },

    config: {
        load: function(file) {

        },
        write: function(file, data) {

        }
    }
}