var cli = require("commander");

// simple command line interface

cli.usage("[options]").
    option("--config <config>", "A JSON config file", "meta4qa.json").
    option("--debug", "allow @bug features/scenarios to execute").
    option("--vocab <vocab>", "folder containing vocab JS files").
    option("--files <path>", "folder containing support files (./features/files)", "./features/files").
    option("--initialize", "create initial files (meta4qa.json) and folders (./features).").
    option("--example", "create some examples in ./features").
    option("--knows", "display supported phrases").
    option("--only", "run only ").
    option("--audit", "validate and display parsed features in JSON without execution").
    option("--archive <path>", "folder to save archived execution results").
    option("--repeat <times>", "repeat the features (default = 1)", "1").
    option("--timeout <millseconds>", "set timeout for feature runs - or scope to scenarios/features with @timeout").
    option("--features <path>", "folder containing .feature files (./features)")

module.exports = cli;
