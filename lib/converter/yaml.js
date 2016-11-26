var yaml = require("js-yaml");

module.exports = function(raw, done) {
    done( null, yaml.load(raw) );
}

