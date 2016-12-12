var meta4qa = require("../index"), _ = meta4qa._;


var config = meta4qa.configure( {name: "debug", features: "features/failure.feature", config: "qa.json" });

var runtime = new meta4qa.Engine(config);

runtime.dialect.learn( require("meta4qa-common"), "common" );

runtime.execute();

console.log("meta4qa: %j", _.keys(meta4qa));

