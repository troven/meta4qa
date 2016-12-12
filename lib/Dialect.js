var Yadda = require('diet-yadda'); // forked to reduce deployed size
var fs = require("fs");
var path = require("path");

var debug = require('debug')('meta4qa:dialect');
var error = require('debug')('meta4qa:err');
var assert = require("assert");

var _ = require('lodash');

var Events = require('events');
var async = require("async");

var helps = require('./helpers'), vars = helps.vars, files = helps.files;
var Scope = require('./Scope');

module.exports = function(config) {
    assert(config, "Missing config");

    var NOOPS = ["skip", "todo", "bug", "only"];

    var self = this;
    this.extensions = [".feature"];

    self.scope = new Scope( { dialects: {}, phrases: {} }, config );

    // defensive feature paths
    var featuresPath = self.scope.paths.features = self.scope.paths.features || config.features;
    assert(featuresPath, "Missing features path");

    // defensive custom phrases
    var phrasesPath = self.scope.paths.phrases || "./phrases/";

    self.scope.yadda = _.defaults(self.scope.yadda, {
        l16n: "English",
        featuresPath: featuresPath,
        stepsPath: phrasesPath
    });

//    scope = _.extend(scope, config.vars);

    var Locale = Yadda.localisation[self.scope.yadda.l16n];
    this.dictionary = new Yadda.Dictionary();
    this.dictionary.define('CSV', /([^\u0000]*)/, require("./converter/csv") );
    this.dictionary.define('JSON', /([^\u0000]*)/, require("./converter/json") );
    this.dictionary.define('TEXT', /([^\u0000]*)/, require("./converter/text") );
    this.dictionary.define('JS', /([^\u0000]*)/, require("./converter/js") );

    // refactor
    this.dictionary.define('file_folder', /(file|folder)/);

    this.library = new Locale.library(this.dictionary);
    this.yadda = new Yadda.Yadda(this.library, self.scope);

    // internal closure to collect known phrases
    var learns = function(knows) {
        this.explain = function(prefix, phrases) {
            if (_.isString(phrases)) {
                knows[prefix].push(phrases);
                return;
            }
            _.each(phrases, function(phrase) {
                knows[prefix].push(phrase);
            });
        }
        this.given = function(phrases) {
            this.explain("given", phrases);
        };
        this.when = function(phrases) {
            this.explain("when", phrases);
        };
        this.then = function(phrases) {
            this.explain("then", phrases);
        };
        return this;
    };

    this.knows = function(done) {
        var knows = { given: [], when: [], then: [], phrases: [] };

        _.each(self.scope.dialects, function(dialect, name) {
            knows.phrases.push(name);
            if (_.isFunction(dialect) ) {
                dialect( learns(knows), config, config, this);
            };
        });

        done && done(knows, self);
        return knows;
    }

    // Dynamically load internal Dialects from a folder

    this.dialect = function(stepsDir) {
        if (!stepsDir) {
            debug("missing dialect folder");
            return;
        }
        assert(files.exists(stepsDir), "Missing dialect: "+stepsDir);
        // support string or array
        var stepsFiles = _.isString(stepsDir)?fs.readdirSync(stepsDir):_.isArray(stepsDir)?stepsDir:[];

        var foundDialects = 0;
        _.each(stepsFiles, function(file) {
            if (file.lastIndexOf(".js"))
                self.requires(stepsDir+"/"+file);
                foundDialects++;
        })


        return self;
    }

    // Test if a Dialect controlled is known

    this.known = function(name) {
        var fn = self.scope.phrases[name];
        (!fn || !_.isFunction(fn))?false:true;
    }

    // Register a named Dialect function

    this.learn = function(fn, name) {
        assert(fn, "Missing learn fn()");
        assert(_.isFunction(fn), name+" is not a fn()");
        assert(name, "missing name for learn fn()");


        if (this.known(name)) {
            debug("ignored duplicate phrase: "+name);
            return self.scope.phrases;
        }
        // a dialect is a fn() that instantiases a Dialect
        self.scope.dialects[name] = fn;
        assert(self.scope.dialects[name], "not learnt: "+name);

        // a phrase is an instantiated dialect
        self.scope.phrases[name] = fn(self.library, self.scope, {}, self );
        assert(self.scope.phrases[name], "not phrases: "+name);

        debug("knows "+name);
        return self.scope.phrases;
    }

    // Require a Dialect (.js) file by path

    this.requires = function(required, onRequired) {
        var items = _.isArray(required)?required:[];
        // Supports .js separated by ,
        if (_.isString(required) ) {
            items = required.split(",");
        };
        _.each(items, function(name) {
            var phrases = false;
            if (!self.known(name) && !self.known("meta4qa-"+name)) {
                phrases = onRequired?onRequired(name):require(name);
                assert(phrases, "Failed to require "+name);
                name = path.basename(name, ".js");
                self.learn(phrases, name);
            } else {
                debug("already learnt: " + name);
            }
        });
        return false;
    }

    // Registered Dialect phrases

    this.annotations = function(annotations, scope, scope2) {
        assert(scope, "missing scope");
        assert(annotations, "missing annotations");
        assert(self.scope.phrases, "missing Dialect phrases");

        _.each(self.scope.phrases, function(dialect, name) {
            if (!dialect) error("Missing dialect controller: "+name);
            dialect.annotations && dialect.annotations(self, annotations, scope, scope2);
        });

        return self;
    }

    this.scenarios = function(scope) {
        assert(scope, "missing scope");
        assert(self.scope.phrases, "missing phrases");

        self.scope.emit("scenario", scope);

        _.each(self.scope.phrases, function(dialect, name) {
            if (!dialect) error("Missing phrase: "+name);
            dialect.scenario && dialect.scenario(self, scope);
        });
//        debug("scenario-scoped: %s", _.keys(self.scope.phrases));
        return self;
    }

    this.features = function(scope) {
        assert(scope, "missing scope");
        assert(self.scope.phrases, "missing phrases");
        scope.emit("feature", scope);

        _.each(self.scope.phrases, function(dialect, name) {
            if (!dialect) error("Missing phrase: "+name);
            dialect.feature && dialect.feature(self, scope);
        });
//        debug("feature-scoped: %s", _.keys(self.scope.phrases));
        return self;
    }

    // Return an array of parsed features

    this.audit = function(stepsDir, filter) {
        assert(stepsDir, "Missing features to audit");
        var audit = [];
        filter = filter || ".feature";

        helps.files.find(stepsDir, filter, function(filename, feature) {
            feature.id = vars.uuid(filename);
            feature.name = path.basename(filename.substring(stepsDir.length),filter);
            audit.push(feature);
        })
        return audit;
    }

    // Load and Parse a feature definition

    this.load = function(file, found) {
        assert(file, "missing file");
        var stat = fs.statSync(file);
        if (stat.isDirectory()) {
            _.each(fs.readdirSync(file),function(path) {
                self.load(file+"/"+path, found);
            })
        } else if (stat.isFile() && self.supports(file)) {
            var feature = self.parse(file);
            feature.filename = file;
            found && found(self, feature);
            return feature;
        }
    }

    // Do we support the Feature extension

    this.supports = function(file) {
        var ext = file.lastIndexOf(".");
        if (ext<1) return false;
        return self.extensions.indexOf(file.substring(ext))>=0?true:false;
    }

    //this.loadFeature = function(file) {
    //    var epic = this.parse(file);
    //    debug("load epic "+name+" from: "+file);
    //    return epic;
    //}
    //

    // Parse a .feature file into JSON

    this.parse = function(file) {
        assert(file, "Missing feature file");
        var Parser = new Yadda.parsers.FeatureFileParser();
        var name = path.basename(file);
        debug("parse "+name+" from: "+file);
        var feature = Parser.parse(file);
        assert(feature, "Invalid feature file: "+file);
        return feature;
    }

    this.parseRaw = function(file) {
        assert(file, "Missing feature file");
        var Parser = new Yadda.parsers.FeatureParser();
        var feature = Parser.parse(file);
        assert(feature, "Invalid feature file: "+file);
        return feature;
    }


    // Execute a phrase

    this.execute = function(phrase, scope, done) {
        assert(phrase, "Missing phrase");
        assert(scope, "Missing scope");

        if (!self._boot) {
            self._boot = new Date().getTime();
            self.scope.emit("boot");
            debug("booted by: %s", phrase);
        }

        phrase = vars.$(phrase, scope.vars);
        var ran = self.yadda.run(phrase, scope);
        done && done();

        return ran;
    }

    // Get the title for the Feature
    this.title = function(title) {
        return title || "Feature";
    }

    // test if scope contains an annotation that implies No-Operation
    this.noop = function(scope) {
        if (!scope) return false;
        if (config.debug && scope.bug) delete scope.bug;
        return vars.synonym(scope,NOOPS);
    }
}
