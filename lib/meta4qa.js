#!/usr/bin/env node

/**
 * meta4qa
 *
 * Command Line launcher
 *
 * (c) Troven Software 2009-2015. Apache Licensed.
 *
 */

var pkg = require("../package");
var _ = require("lodash");
var meta4qa = require("./index"), cli = meta4qa.cli, Runtime = meta4qa.Runtime, files = meta4qa.files;
var debug = require("debug")("meta4qa");
var assert = require('assert');

cli.version(pkg.name+" v"+pkg.version);
cli.option("--reporter <reporter>", "Mocha reporter [spec|simple|tap|xunit|nyan|progress]");

cli.command('*').description("[.feature file]").action(function (featureFile) {
    cli.features = featureFile;
    if (arguments.length>2) {
        console.log("Only one .feature file allowed on the command line");
        process.exit(1);
    }
});
var config = false;
try {
    config = meta4qa.configure(cli);
    if (!config) {
        cli.help();
        return;
    }
} catch(e) {
    exit;
}

var qa = new Runtime(config);
qa.config.paths = _.extend({}, pkg.directories, qa.config.paths);
qa.config.name = pkg.name;
qa.config.reporter = qa.config.reporter || "spec";

// auto-install dependent dialects - needed in top-level project to resolve external projects

_.each(pkg.dependencies, function(ver, dep) {
    if (dep.indexOf(pkg.name+"-")>=0) {
        debug("%s install: %s @ %s",pkg.name, dep, ver);
        qa.dialect.learn(require(dep),dep);
    }
});

if (qa.commands(cli)) {
    return;
}

qa.execute();
