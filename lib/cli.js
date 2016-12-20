var cli = require("commander");

// simple command line interface

var name = (cli.name?cli.name+" ":"");
var featurePath = (cli.features?cli.features:"./features");

cli.usage("[options]").
    option("--config <config>", "A JSON config file").
    option("--dialect <folder>", "contains any custom dialects").
    option("--initialize", "create default files and folders").
    option("--knows", "show phrase patterns for known dialects").
    option("--audit", "validate and display parsed features (as JSON)").
    option("--archive <folder>", "folder to save archived execution results").
    option("--repeat <times>", "repeat the features (default = 1)", "1").
    option("--timeout <millseconds>", "default @timeout for scenarios/features").
    option("--debug", "execute @bug features/scenarios").
    option("--only", "execute d@only features/scenarios").
    option("--features <folder>", "path to folder of *.feature files");

module.exports = cli;
