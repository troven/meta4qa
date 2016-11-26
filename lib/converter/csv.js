var Converter = require("csvtojson").Converter;

module.exports = function(raw, done) {
    var converter = new Converter({});
    converter.fromString(raw, function(err,result){
//console.log("CSV: %s -> %j", raw, result);
        done(err, result);
    });
}