var Yadda = require('diet-yadda'); // forked to reduce deployed size
var fs = require("fs");
var path = require("path");

var debug = require('debug')('meta4qa');
var error = require('debug')('meta4qa:err');
var assert = require("assert");

var _ = require('lodash');

var Events = require('events');
var async = require("async");

var helps = require('./helpers'), vars = helps.vars, files = helps.files;

module.exports = function(config) {
    assert(config, "Missing config");

    var NOOPS = ["skip", "todo", "bug", "only"];

    var self = this, vocabs = {}, dialects = {}, scope = {};
    this.extensions = [".feature"];
    this.config = _.defaults(config, require("./defaults"));

    var featuresPath = this.config.paths.features || this.config.featuresPath;
    assert(featuresPath, "Missing features path");

    this.config.yadda = _.defaults(this.config.yadda, {
        l16n: "English",
        featuresPath: featuresPath,
        stepsPath: "./vocab/"
    });

//    scope = _.extend(scope, config.vars);

    var Locale = Yadda.localisation[this.config.yadda.l16n];
    this.dictionary = new Yadda.Dictionary();
    this.dictionary.define('CSV', /([^\u0000]*)/, require("./converter/csv") );
    this.dictionary.define('JSON', /([^\u0000]*)/, require("./converter/json") );
    this.dictionary.define('TEXT', /([^\u0000]*)/, require("./converter/text") );
    this.dictionary.define('JS', /([^\u0000]*)/, require("./converter/js") );

    this.dictionary.define('file_folder', /(file|folder)/);

    this.library = new Locale.library(this.dictionary);
    this.yadda = new Yadda.Yadda(this.library, scope);

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
        var knows = { given: [], when: [], then: [], dialects: [] };

        _.each(vocabs, function(vocab, name) {
            knows.dialects.push(name);
            if (_.isFunction(vocab) ) {
                vocab( learns(knows), config, config, this);
            };
        });

        done && done(knows, self);
        return knows;
    }


    // Dynamically load internal Dialects from a folder

    this.vocab = function(stepsDir) {
        if (!stepsDir) {
            debug("missing dialect folder");
            return;
        }
        assert(files.exists(stepsDir), "Missing steps: "+stepsDir);
        var stepsFiles = fs.readdirSync(stepsDir);
        debug("vocab folder: "+stepsDir);
        _.each(stepsFiles, function(file) {
            if (file.lastIndexOf(".js"))
                self.requires(stepsDir+"/"+file);
        })
        return self;
    }

    // Test if a Dialect controlled is known

    this.known = function(name) {
        var fn = dialects[name];
        (!fn || !_.isFunction(fn))?false:true;
    }

    // Register a named Dialect function

    this.learn = function(fn, name) {
        assert(fn, "Missing learn fn()");
        assert(_.isFunction(fn), name+" is not a fn()");
        assert(name, "missing name for learn fn()");


        if (this.known(name)) {
            debug("ignored duplicate dialect: "+name);
            return dialects;
        }
        // save the vocab API so we can target methods later
        vocabs[name] = fn;
        assert(vocabs[name], "not learnt: "+name);

        // save instantiated / intialized dialect
        dialects[name] = fn(self.library, self.config, scope, self );
        assert(dialects[name], "not dialects: "+name);

        debug("knows "+name);
        return dialects;
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

    // Registered Dialect dialects

    this.annotations = function(annotations, scope, scope2) {
        assert(scope, "missing scope");
        assert(annotations, "missing annotations");
        assert(dialects, "missing Dialect dialects");

        _.each(dialects, function(vocab, name) {
            if (!vocab) error("Missing dialect controller: "+name);
            vocab.annotations && vocab.annotations(self, annotations, scope, scope2);
        });
//        debug("annotations: %s", _.keys(dialects));
        return self;
    }

    this.scenarios = function(scope) {
        assert(scope, "missing scope");
        assert(dialects, "missing Dialect dialects");

        _.each(dialects, function(vocab, name) {
            if (!vocab) error("Missing dialect controller: "+name);
            vocab.scenario && vocab.scenario(self, scope);
        });
//        debug("scenario-scoped: %s", _.keys(dialects));
        return self;
    }

    this.features = function(scope) {
        assert(scope, "missing scope");
        assert(dialects, "missing Dialect dialects");

        _.each(dialects, function(vocab, name) {
            if (!vocab) error("Missing dialect controller: "+name);
            vocab.feature && vocab.feature(self, scope);
        });
//        debug("feature-scoped: %s", _.keys(dialects));
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
        phrase = vars.$(phrase, scope.vars);
        return self.yadda.run(phrase, scope, done);
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

    // if (config.yadda.stepsPath) {
    //     self.vocab(__dirname+"/"+config.yadda.stepsPath);
    // }
}
