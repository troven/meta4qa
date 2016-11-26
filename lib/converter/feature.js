var Yadda = require('yadda'); // https://github.com/acuminous/yadda
var assert = require("assert");

module.exports = function(raw, done) {
    assert(raw, "Missing file data");
    var Parser = new Yadda.parsers.FeatureParser();
    var feature = Parser.parse(raw);

    // feature tags
    feature.tags = [];
    if (feature.annotations && feature.annotations.tags) {
        feature.tags = feature.annotations.tags.split(",");
    }

    done && done(null, feature);
    return feature;
}