var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var async = require('async');
var mkdirp = require("mkdirp");
var helpers = require("./helpers"), files = helpers.files;
var debug = require("debug")("meta4qa:configure");
var defaults = require("./defaults");
var Dialect = require("./Dialect");


module.exports = function(cli, configFile) {
    assert(cli, "missing CLI/config");
    assert(cli.name, "Missing name");
    assert(configFile, "Missing default configFile");

    // a fresh config
    var config = _.extend({}, defaults);
    config.paths.features = cli.features || config.paths.features;

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
    // setup file paths
//    config.paths.features = config.paths.features;

    // explicit location of our .json config file
    var CONFIG_FILE = config.configFile = (cli.configFile || cli.config);

    var configFiles = [];
    configFiles.push( CONFIG_FILE || configFile );

    // extend config from user home directory
    var userHome = config.paths.user_home = process.env.HOME || process.env.USERPROFILE;
    configFiles.push( helpers.files.path(userHome, "."+configFile) );
    configFiles.push( helpers.files.path(userHome, configFile) );
    debug("User home: %s (%s)", userHome, configFile);

    delete config.config;
    config = helpers.files.config(configFiles, config);

    var foundFeatures = (config.paths.features && files.exists(config.paths.features));
    var pleaseSetup = (cli.example || cli.initialize)?true:false;

    if ( !foundFeatures && !pleaseSetup ) {
        debug("Missing features path: %s", config.paths.features);
        process.exit(1);
        return;
    }

    // --target overrides default target

    if (cli.target) {
        config.target = config.targets[cli.target] || {};
    }

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
    config.name = cli.name || config.name || helpers.pkg.name;

    // iterate through user environment adding properties
    // (prefixed with META4_) to config (e.g. META4_AGENT_DEFAULT_USERNAME=blah )

    config.paths.files = config.files = config.paths.files || config.files || "./"
    config.configFile = CONFIG_FILE;

    helpers.vars.env(cli.envPrefix || "META4_", process.env, config);

    return config;
}