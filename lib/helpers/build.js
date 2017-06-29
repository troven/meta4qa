var assert = require("assert");
var debug = require("debug")("meta4qa:helps:build");
var _ = require('lodash');

var mkdirp = require("mkdirp");
var fs = require("fs");
var paths = require("path");
var hbs = require('handlebars');

var files = require("./files");
var vars = require("./vars");

var DEBUG = false;

var self = module.exports = {
    _: _,
    debug: debug,
    files: files,
    vars: vars,
    hbs: hbs,
    clobber: false,

    path:function() {
        return paths.normalize(paths.join.apply(this,arguments));
    },

    save:function(to, data) {
        if (this.clobber || !files.exists(to)) {
            fs.writeFileSync(to, data);
            DEBUG && debug("saved: %s", to);
            return files.exists(to);
        } else {
            DEBUG && debug("exists: %s", to);
            return false;
        }
    },

    render: function(source, ctx) {
        try {
            var template = hbs.compile(source);
            var t = template(ctx);
            return t;
        } catch(e) {
            throw new Error(e);
        }
    },

    assets: function(dir, to, ctx, done) {
        assert(dir, "missing copy from");
        assert(to, "missing copy to");
        if (this.clobber) {
            console.log("! clobbering files in %s", to);
        }
        debug("building assets: %s to %s", dir, to);
        ctx = _.extend({ blueprint: {} }, ctx);
        ctx.pkg = _.extend({ directories: { "cwd": process.cwd() } },ctx.pkg);

        var pkg_dir = self.path(process.cwd(), dir);
        var pkg_json = self.path(pkg_dir, "package.json");
        from = false;
        var _DEBUG = true; // ctx.debug || DEBUG;
        var packaged = files.exists(pkg_json)?true:false;
        // are we nicely packaged ?
//        _DEBUG && debug("PKG? %s @ %s",  packaged, pkg_json);

        if (packaged) {

            var pkg = require(pkg_dir);
            if (_.isFunction(pkg)) {
                // fn() enriches text
                pkg = pkg.call(ctx, self);
                _DEBUG && debug("PKG(): %s (%s)",  pkg.pkg.name, pkg.pkg.author);
            } else {
                // package.json enriches context
                _DEBUG && debug("PKG: %s (%s)", pkg.pkg.name, pkg.pkg.author);
            }

            ctx = _.extend({}, ctx, _.pick(pkg, ["name", "author", "description", "directories"]) );
            assert(ctx.pkg, "Missing blueprint package.json");

            ctx.pkg.directories = _.extend({ assets: "./assets", templates: "./templates" },ctx.directories);

            var from = self.path(dir, ctx.pkg.directories.assets);
            var folders = files.find(self.path(dir, ctx.pkg.directories.templates));

            _DEBUG && debug("partials: %j ", _.keys(folders));
            _.each(folders, function(template, folder) {
                var name = paths.basename(folder, ".hbs");
                hbs.registerPartial(name,template);
            })

            from = self.path(dir, ctx.pkg.directories.assets);

        } else {
            var assets_dir = ctx.pkg.directories.assets||".";
            from = self.path(dir, assets_dir );
        }

        _DEBUG && debug("built assets: %s -> %s", from, to);
        ctx.blueprint.from = from;
        ctx.blueprint.to = to;

        self.copy(from, to, ctx);
        done && done();
    },

    builder: function(from, to, ctx) {
        var found = false;
        // using a blueprint builder ... matches regexp to fn()

        if (ctx.builder && ctx.builder.paths) {
            _.each(ctx.builder.paths, function(fn, match) {
                var regex = new RegExp(match);
                if (regex.test(from)) {
                    DEBUG && debug("builder: %s ... %s", from, to);
                    fn(from, to, ctx);
                    found = true;
                }
            })
        }
        return found;
    },

    copy: function(from, to, ctx) {
        assert(from, "missing copy from");
        assert(to, "missing copy to");
        ctx = ctx || {};
        var froms = fs.readdirSync(from);
        var _DEBUG = ctx.debug || DEBUG;

        files.mkdirp(to);
        _DEBUG && debug("cp folder: %j-> %s", froms, to);
        _.each(froms, function(file) {
            var from_file = self.path(from, file);
            var to_file = self.path(to, file);

            if (self.builder(from_file, to_file, ctx)) {
                _DEBUG && debug("custom: %s", to_file);
                // done
            } else {
                _DEBUG && debug("_cp: %s -> %s", from_file, to_file);
                self._copy(from_file, to_file, ctx);
            }
        });
    },

    _copy: function(from, to, ctx) {
        assert(files.exists(from));

        if (files.isFile(from)) {
            self.copyFile(from, to, ctx);
        } else if (files.isFolder(from) ) {
            self.copyFolder(from, to, ctx);
        } else throw "oops:filetype:"+from;
    },


    copyFile: function(from, filename, ctx) {
        var name = paths.basename(filename);
        var _DEBUG = ctx.debug || DEBUG;
        var has_ctx = !_.isEmpty(ctx);

        try {

            if (has_ctx && name.indexOf("_") === 0) {
                filename = self.path( paths.dirname(filename), name.substring(1) );
                _DEBUG && debug("template: %s -> %s", from, filename);
                self._copyTemplate(from, filename, ctx);
            } else if (has_ctx && name.indexOf("{{") >= 0) {
                self._copyTemplates(from, filename, ctx);
            } else {
                _DEBUG && debug("file: %s -> %s", from, filename);
                self._copyFile(from, filename);
            }
        } catch(e) {
            console.warn("ERROR: %s in %s", e, filename);
        }
    },

    _copyFile: function(from, to) {
        if (from.lastIndexOf(".DS_Store")>-1) return;
        var folder = paths.dirname(to);
        files.mkdirp(folder);
        var data = fs.readFileSync(from);
        self.save(to, data);
    },

    copyFolder: function(from, to, ctx) {
        assert(from, "Missing from file");
        assert(to, "Missing to file");
        assert(ctx, "Missing context");

        var path = self.splitReferencePath(from);
        assert(path, "Path {{...}} invalid: "+from);
        var _DEBUG = ctx.debug || DEBUG;

        var every = path[0];
        var qs = path[1];

        var everyFolder = function(_ctx, key) {
            _ctx.key = key;
            var path = self.getFilename(from, to, key, _ctx);
            mkdirp.sync(path);
            _DEBUG && debug("cp %s folder: %s -> %s", key, from, path);
            self.copy(from, path,_ctx);
        };

        if (every && from.indexOf("{{")>=0) {

            var loop = qs ? vars.findInPath(ctx, "$.."+qs): vars.findNamed(ctx, every);
            var isSingular = _.isString(loop)?true:false;

            if (isSingular) {
                _DEBUG && debug("folders {%s}: %s -> %s -> %j", every, from, to, loop );
                everyFolder(ctx, loop);

            } else {
                _DEBUG && debug("folders {%s %s}: %s -> %s -> %j", every, qs ,from, to, _.keys(loop) );
                _.each(loop, everyFolder );
            }

        } else {
            files.mkdirp(to);
            _DEBUG && debug("cp folder: %j -> %s", path, to);
            self.copy(from,to,ctx);
        }
    },

    _copyTemplate: function(from, to, ctx) {
        var _DEBUG = true; //ctx.debug || DEBUG;

        var to_dir = paths.dirname(to);
        mkdirp.sync(to_dir);

        // magic {{..}} paths
        var every = self.getReferencePath(from);
        if (every && vars.get(ctx, every)) {
            var key = vars.get(ctx, every);
            DEBUG && debug("_copyTemplate ...: %s -> %s -> %s", from, every, key);
            self._copyTemplates(from, to, ctx);
        } else {
            var src = fs.readFileSync(from, "UTF-8");
            var name = paths.basename(from);
            assert( files.exists(to_dir), "Missing destination folder: "+to_dir);
            var meta = _.extend({}, ctx, { self: {}});
            var rendered = self.render(src, meta);
            if (rendered.trim()) {
                self.save(to, rendered);
                DEBUG && debug("_copyTemplate: %s", to); //meta
            } else {
                DEBUG && debug("_emptyTemplate: %s", to); //meta
            }
        }
    },

    _copyTemplates: function(from, to, ctx) {
        var every = self.getReferencePath(from);
        var loop = vars.get(ctx, every);
        var _DEBUG = ctx.debug || DEBUG;

//        DEBUG && debug("cp templates: %s -> %s (%s)\n\t%j", from, to, loop, ctx);

        var src = fs.readFileSync(from, "UTF-8");
        // DEBUG && debug("src: %s -> %j", from, src);

        // singleton
        if (_.isString(loop)) {
            var _loop = {};
            _loop[loop] = ctx;
            loop=_loop;
        }
        _DEBUG && debug("_every: %s x %s", _.keys(loop).length, every);

        // save all interpolated files

        _.each(loop, function(_ctx, key) {
            var path = self.getFilename(from, to, key, _ctx);
            var dir = paths.dirname(path);
            files.mkdirp(dir);
            var meta = _.extend({}, _ctx, { "key": key, self: ctx});
//            _DEBUG && debug("_mk{%s}: %s -> %s\n%j", dir, from, path, meta);
                var new_to = self.render(to, ctx);

            _DEBUG && debug("render: %s", new_to);
            try {
                var rendered = self.render(src, meta);
                if (rendered.trim()) {
                    _DEBUG && debug("_copyTemplates: %s", path); //meta
                    self.save(new_to, rendered);
                } else {
                    _DEBUG && debug("_emptyTemplates: %s", path); //meta
                }
            } catch(e) {
                console.log("Broken Template: %s", e)
                throw new Error(e);
            }
        });

    },

    getReferencePath: function(_from) {
        var from = paths.basename(_from);
//DEBUG && debug("getReferencePath: %s -> %s", from, _from);
        var mstart = from.indexOf("{{");
        if (mstart<0) return false;
        var mend = from.indexOf("}}");
        if (mend<0) return false;
        return from.substring(mstart+2, mend);
    },

    splitReferencePath: function(from) {
        var path = self.getReferencePath(from);
        if (!path) return [from,""];
        var ix = path.indexOf("#");
        if (ix<0) return [path, ""];
        var split = [path.substring(0,ix), path.substring(ix+1)];
//        DEBUG && debug("split: %s -> %s %s", from, split[0], split[1]);
        return split;
    },

    getFilename: function(from, to, key, ctx) {
        var every = self.getReferencePath(from);
        var name = paths.basename(from);
        var to_dir = paths.dirname(to);

        name = name.replace("#","_");
        every = every.replace("#","_");

        var t = {};
        vars.set(t, every, key);
        var file = self.render(name, t);
        return self.path(to_dir,file);
    },

    json: function(file, json) {
        assert(file, "Missing JSON file");
        assert(json, "Missing JSON");

        json = _.isString(json)?json:JSON.stringify(json, null, '\t');
        self.save(file, json);
    }
}
