var assert = require("assert");
var fs = require("fs");
var path = require("path");
var _ = require('lodash');
var mkdirp = require("mkdirp");
var async = require("async");
var yaml = require("js-yaml");

var debug = require("debug")("meta4qa:helps:files");
var converts = require('../converter');

var self = module.exports = _.extend({
    FILE_ENCODING: "UTF-8",

    path:function(dir, file) {
        var filename = path.normalize(dir+"/"+file);
        // if (filename.indexOf(dir)!=0) throw new Error("File before root: "+filename);
        return filename;
    },

    root:function(scope, path, file) {
        assert(scope, "Missing scope");
        assert(scope.paths, "Missing paths");
        if (!file) {
            file = path;
            path = "files";
        }

        var dir = scope.paths[path];
        assert(dir, "Missing root folder: "+path);
        var filename = self.path(dir, file);
        return filename;
    },

    config: function(configFile, options) {
        assert(configFile, "Missing configFile");
        options = options || {};
        var configFiles = [];

        if (_.isString(configFile)) configFiles.push(configFile);
        else if (_.isArray(configFile)) configFiles = configFile;
        else throw "Invalid config file: "+configFile;

        var config = _.extend({ paths: {} }, options);
        var configured = false;
        async.everySeries(configFiles, function(file, iteratee) {
            if (self.exists(file)) {
                self.parse(file, function(filename, json, err) {
                    _.extend(config, json);
                    _.extend(config.paths, json.paths);
                    configured = true;
                    iteratee(null, true );
                });
            } else {
                iteratee(null, true );
            }
        });
        if (!configured) return false;
        debug("configured: %j\n%j\n" , configFiles, config)
        return config;
    },

    load:function(file, options) {
        assert(file, "Missing file");
        assert(self.exists(file), "File not found: "+file);
        options = options || {};
        debug("load %s: %s", self.FILE_ENCODING, file);
        var raw = fs.readFileSync(file, self.FILE_ENCODING);
        return raw;
    },

    stream:function(file, options) {
        assert(file, "Missing file");
        assert(self.exists(file), "File not found: "+file);
        options = options || {};
        debug("streaming: %s", file);
        return fs.createReadStream(file, options);
    },

    save:function(file, data) {
        assert(file, "Missing file");
        assert(data, "Missing data");
        fs.writeFileSync(file, data);
        return true;
    },

    saveYAML:function(file, data) {
        assert(file, "Missing file");
        assert(data, "Missing data");
        assert(_.isObject(data) || _.isArray(), "Invalid data");

        fs.writeFileSync(file, yaml.safeDump(data) );
        return true;
    },

parse:function(file, onFound) {
        assert(file, "Missing file");
        assert(self.exists(file), "File not found: "+file);
        var raw = self.load(file);
        return self.convert(file, raw, onFound);
    },

    convert: function(file, raw, onFound) {
        var format = self.extension(file);
        var converter = converts[format];
        if (!converter) {
            onFound?onFound(file, raw):raw;
        } else {
            converter(raw, function(err, json) {
                assert(!err, format+" not valid: "+file+" --> ");
                onFound?onFound(file, json, err):json;
            })
        }
    },

    mkdirp: function(path) {
        mkdirp.sync(path);
    },

    rmrf: function(path) {
        debug("rm -rf %s [%s]", path, self.exists(path));
        if( self.exists(path) ) {
            if(self.isDirectory(path)) {
                fs.readdirSync(path).forEach(function(file,index){
                    var curPath = path + "/" + file;
                    self.rmrf(curPath);
                });
                fs.rmdirSync(path);
            } else {
                fs.unlinkSync(path);
            }
        }
    },

    isDirectory: function(file) {
        try {
            var stat = fs.statSync(file);
            return stat?stat.isDirectory():false;
        } catch(e) {
            return false;
        }
    },

    isFile: function(file) {
        return !this.isDirectory(file);
    },

    dirname: function(file) {
        return path.dirname(file    );
    },
    extension: function(path) {
        var ix = path.lastIndexOf(".");
        if (ix<0) return false;
        return path.substring(ix+1).toLowerCase();
    },

    matches: function(path, filter) {
        assert(path, "Missing path");
        if (!filter) return true;
        return path.indexOf(filter)>=0;
    },

    find: function(from, filter, onFound) {
        if (!self.exists(from)) return {};
        from = path.normalize(from);
        var dirs = {};
        self.follow(from, function(dir) {
            var file = dir;

            if (self.isFile(dir) && self.matches(file, filter)) {
                self.parse(dir, function(filename,json) {
                    var name = filename.substring(from.length);
                    dirs[name] = onFound?onFound(dir, json):json;
                });
            }
        })
        return dirs;
    },

    follow: function(path, onFound, allDone) {
        if (!self.exists(path)) return;

        var found = fs.readdirSync(path);
        // breadth-first
        _.each(found, function(dir) {
            dir = self.path(path, dir);
            if (self.isFile(dir)) {
                onFound(dir);
            }
        });

        _.each(found, function(dir) {
            dir = self.path(path, dir);
            if (self.isFolder(dir)) {
                self.follow(dir, onFound);
            }
        });

        allDone && allDone();
    },

    exists: function(file) {
        try {
            var stat = fs.statSync(file);
            return stat?true:false;
        } catch(e) {
            return false;
        }
    },

    size: function(file) {
        try {
            var stat = fs.statSync(file);
            return stat?stat.size:-1;
        } catch(e) {
            return -1;
        }
    }

});
self.isFolder = self.isDirectory;
