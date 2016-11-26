var pkg = require("../package");
var debug = require("debug")("meta4qa-blueprint");
var assert = require("assert");

module.exports = {
    pkg: pkg
}

assert(pkg.name, "Missing Blueprint name");
debug("%s", pkg.description || pkg.name);