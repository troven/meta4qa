var assert = require("assert");
var fs = require("fs");
var path = require("path");
var _ = require('lodash');
var mkdirp = require("mkdirp");
var async = require("async");

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
        assert(options, "Missing existing config");
        if (!self.exists(configFile)) return options;
            var json = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            var paths = options.paths;
            options = _.extend(options, json);
            options.paths = _.extend(paths, options.paths);

            debug("configured: %s" , configFile)
        return options;
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
        fs.writeSync(file, data);
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
                onFound?onFound(file, json):json;
            })
        }
    },

    mkdirp: function(path) {
        mkdirp.sync(path);
    },

    rmrf: function(path) {
//        debug("rm -rf %s", path);
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
        _.each(found, function(dir) {
            dir = self.path(path, dir);
            if (self.isFolder(dir)) {
                self.follow(dir, onFound);
            } else onFound(dir);
        })
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
