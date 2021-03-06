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

    debug("Default folders: %j", config.paths);
    var pleaseSetup = (cli.example || cli.initialize)?true:false;

    // setup file paths
//    config.paths.features = config.paths.features;

    // explicit location of our .json config file
    var CONFIG_FILE = config.configFile = cli.config || cli.configFile || configFile;

    var configFiles = [];

    // extend config from user home directory
    var userHome = config.paths.user_home = process.env.HOME || process.env.USERPROFILE;
    configFiles.push( helpers.files.path(userHome, "."+configFile) );
    configFiles.push( helpers.files.path(userHome, configFile) );
    debug("User home: %s (%s)", userHome, configFile);

    configFiles.push( CONFIG_FILE );

    delete config.config;
    var loaded_config = helpers.files.config(configFiles, config);
    if (!loaded_config) {
        if (!pleaseSetup) {
            console.log("Missing config file: %s - please use --initialize or --example to create.", configFiles);
            process.exit(1);
        }
        console.log("Config file not found: %j", configFiles);
    }
    config = _.extend({ paths: {} }, (loaded_config?loaded_config:config) );

    config.paths.features = cli.features || config.paths.features;
    debug("Features folder: %s", config.paths.features);

    var foundFeatures = (config.paths.features && files.exists(config.paths.features));

    if ( !foundFeatures && !pleaseSetup ) {
        console.log("Missing features path: %s - please use --initialize to create.", config.paths.features);
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

    // set default resources from config sugar
    config.agents.default = config.agent;
    config.targets.default = config.target;

    helpers.vars.env(cli.envPrefix || "QA_", process.env, config);

    return config;
}
