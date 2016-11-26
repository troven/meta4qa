var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var mkdirp = require("mkdirp");
var helpers = require("./helpers");
var debug = require("debug")("meta4qa:configure");
var defaults = require("./defaults");
var Dialect = require("./Dialect");

const CONFIG_FILE = 'meta4qa.json';

module.exports = function(cli) {
    assert(cli, "missing CLI/config");

    // a fresh config
    var config = _.extend({}, defaults);

    // if we've passed a CLI - then parse args

    if (cli.parse) {
        // cli options become config defaults

        cli.parse(process.argv);
        _.each(cli.options, function(option) {
            var flag = option.name();
            if (cli[flag]) config[flag] = cli[flag];
        })
    } else {
        _.extend(config, cli);
    }

    // legacy path handling ugliness - deprecation imminent
    
    config.featuresPath = config.paths.features || cli.features || cli.featuresPath || config.featuresPath || "./features";
    config.paths.features = config.featuresPath;

    config.files = config.paths.files || config.files || "./files"
    config.configFile = cli.config || CONFIG_FILE;
    delete config.config;

    // extend config from user home directory

    var userHome = config.paths.user_home = process.env.HOME || process.env.USERPROFILE;
    var userConfigFile = helpers.files.path(userHome, "."+CONFIG_FILE);
    helpers.files.config(userConfigFile, config);

    userConfigFile = helpers.files.path(userHome, CONFIG_FILE);
    helpers.files.config(userConfigFile, config);

    // extend config from local file

    if (helpers.files.exists(config.configFile)) {
        debug("Configuring from: %s", config.configFile);
        helpers.files.config(config.configFile, config);
    } else {
        if (!cli.example && cli.initialize) {
            debug("warning: default configuration. Create " + config.configFile + " or use --config <file>. If it's your first time, use the --example option");
        }
    }

    // --target overrides default target

    if (cli.target) config.target = config.targets[cli.target];

    // make sure we run at least once

    config.repeat = cli.repeat?(new Number(cli.repeat)):1;

    // ensure we've go a valid Archive path

    if (cli.archive) {

        // if repeating, save in nested folders
        config.archivePath = (cli.repeat > 1)?cli.archive + "/" + _.now():cli.archive + "/";

        // make folders
        mkdirp.sync(config.archivePath);
        debug("archiving: " + config.archivePath)
    }

    // greetings
    config.name = config.name || helpers.pkg.name;

    // iterate through user environment adding properties
    // (prefixed with AFFIRM_) to config (e.g. AFFIRM_AGENT_DEFAULT_USERNAME=blah )

    helpers.vars.env(cli.envPrefix || "meta4qa_", process.env, config);

    return config;
}