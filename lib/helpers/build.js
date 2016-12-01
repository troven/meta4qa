var assert = require("assert");
var debug = require("debug")("meta4qa:helps:build");
var _ = require('lodash');

var mkdirp = require("mkdirp");
var fs = require("fs");
var paths = require("path");
var hbs = require('handlebars');

var files = require("./files");
var vars = require("./vars");

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
            debug("saved: %s", to);
        } else {
            debug("exists: %s", to);
        }
    },

    render: function(source, ctx) {
        var template = hbs.compile(source);
        return template(ctx);
    },

    assets: function(dir, to, ctx, done) {
        assert(dir, "missing copy from");
        assert(to, "missing copy to");
        ctx = _.extend({ blueprint: {} }, ctx);
        ctx.pkg = _.extend({ directories: { "cwd": process.cwd() } },ctx.pkg);

        var pkg_dir = self.path(process.cwd(), dir);
        var pkg_json = self.path(pkg_dir, "package.json");
        from = false;

        // are we nicely packaged ?
        if (files.exists(pkg_json)) {

            var pkg = require(pkg_dir);
            if (_.isFunction(pkg)) {
                // fn() enriches text
                pkg = pkg.call(ctx, self);
                debug("PKG(): %s (%s)",  pkg.pkg.name, pkg.pkg.author);
            } else {
                // package.json enriches context
                debug("PKG: %s (%s)", pkg.pkg.name, pkg.pkg.author);
            }

            ctx = _.extend({}, ctx, _.pick(pkg, ["name", "author", "description", "directories"]) );
            assert(ctx.pkg, "Missing blueprint package.json");

            ctx.pkg.directories = _.extend({ assets: "./assets", templates: "./templates" },ctx.directories);

            var from = self.path(dir, ctx.pkg.directories.assets);
            var folders = files.find(self.path(dir, ctx.pkg.directories.templates));

            debug("partials: %j ", _.keys(folders));
            _.each(folders, function(template, folder) {
                var name = paths.basename(folder, ".hbs");
                hbs.registerPartial(name,template);
            })

            from = self.path(dir, ctx.pkg.directories.assets);

        } else {
            var assets_dir = ctx.pkg.directories.assets||".";
            from = self.path(dir, assets_dir );
        }

        debug("build assets: %s -> %s", from, to);
        ctx.blueprint.from = from;
        ctx.blueprint.to = to;

        self.copy(from, to, ctx);
        done && done();
    },

    copy: function(from, to, ctx) {
        assert(from, "missing copy from");
        assert(to, "missing copy to");
        ctx = ctx || {};
        var froms = fs.readdirSync(from);

        debug("cp folder: %s -> %s", from, to);
        _.each(froms, function(file) {
            var from_file = self.path(from, file);
            var to_file = self.path(to, file);

            if (self.builder(from_file, to_file, ctx)) {
                debug("Built file: %s", to_file);
                // done
            } else {
                debug("_cp: %s -> %s / %s", from_file, to, file);
                self._copy(from_file, to_file, ctx);
            }
        });
    },

    _copy: function(from, to, ctx) {
        var stat = fs.statSync(from);
        if (stat && stat.isFile()) {
            self.copyFile(from, to, ctx);
        } else if (stat) {
            self.copyFolder(from, to, ctx);
        }
    },


    copyFile: function(from, filename, ctx) {
        var name = paths.basename(filename);

        if (name.indexOf("_") === 0) {
            filename = self.path( paths.dirname(filename), name.substring(1));
            self._copyTemplate(from, filename, ctx);
        } else if (name.indexOf("{{") >= 0) {
            self._copyTemplates(from, filename, ctx);
        } else {
            self._copyFile(from, filename);
        }
    },

    _copyFile: function(from, to) {
        if (from.lastIndexOf(".DS_Store")>-1) return;
        debug("file: %s", to);
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

        var every = path[0];
        var qs = path[1];

        var everyFolder = function(_ctx, key) {
            _ctx.key = key;
            var path = self.getFilename(from, to, key, _ctx);
            mkdirp.sync(path);
            debug("cp %s folder: %s -> %s", key, from, path);
            self.copy(from, path,_ctx);
        };

        if (every && from.indexOf("{{")>=0) {

            var loop = qs ? vars.findInPath(ctx, "$.."+qs): vars.findNamed(ctx, every);
            var isSingular = _.isString(loop)?true:false;

            if (isSingular) {
                debug("folders {%s}: %s -> %s -> %j", every, from, to, loop );
                everyFolder(ctx, loop);

            } else {
                debug("folders {%s %s}: %s -> %s -> %j", every, qs ,from, to, _.keys(loop) );
                _.each(loop, everyFolder );
            }

        } else {
            mkdirp.sync(to);
            debug("cp folder: %s -> %j", to, path);
            self.copy(from,to,ctx);
        }

    },

    _copyTemplate: function(from, to, ctx) {
        var to_dir = paths.dirname(to);
        mkdirp.sync(to_dir);
        // magic {{..}} paths
        var every = self.getReferencePath(from);
        if (every && vars.get(ctx, every)) {
            var key = vars.get(ctx, every);
            debug("_copyTemplate ...: %s -> %s -> %s", from, every, key);
            self._copyTemplates(from, to, ctx);
        } else {
            var src = fs.readFileSync(from, "UTF-8");
            var name = paths.basename(from);
            assert( files.exists(to_dir), "Missing destination folder: "+to_dir);
            var meta = _.extend({}, ctx, { self: {}});
            var rendered = self.render(src, meta);
            if (rendered.trim()) {
                self.save(to, rendered);
                debug("_copyTemplate: %s", to); //meta
            } else {
                debug("_emptyTemplate: %s", to); //meta
            }
        }
    },

    _copyTemplates: function(from, to, ctx) {
        var every = self.getReferencePath(from);
        var loop = vars.get(ctx, every);

//        debug("cp templates: %s -> %s (%s)\n\t%j", from, to, loop, ctx);

        var src = fs.readFileSync(from, "UTF-8");

        // singleton
        if (_.isString(loop)) {
            var _loop = {};
            _loop[loop] = loop;
            loop=_loop;
        }

        // save all interpolated files

        _.each(loop, function(_ctx, key) {
            var path = self.getFilename(from, to, key, _ctx);
            var dir = paths.dirname(path);
            mkdirp.sync(dir);

            var meta = _.extend({}, _ctx, { "key": key, self: ctx});
//            debug("\t %s ... %s -> %j \n\t%j", from, path, _.keys(meta), _.keys(meta.self));
            var rendered = self.render(src, meta);
            if (rendered.trim()) {
                self.save(path, rendered);
                debug("_copyTemplates: %s", path); //meta
            } else {
                debug("_emptyTemplates: %s", path); //meta
            }
        });

    },

    builder: function(from, to, ctx) {
        var found = false;
        if (ctx.builder && ctx.builder.paths) {
            _.each(ctx.builder.paths, function(fn, match) {
                var regex = new RegExp(match);
                if (regex.test(from)) {
                    debug("builder: %s ... %s", from, to);
                    fn(from, to, ctx);
                    found = true;
                }
            })
        }
        return found;
    },

    getReferencePath: function(_from) {
        var from = paths.basename(_from);
//debug("getReferencePath: %s -> %s", from, _from);
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
//        debug("split: %s -> %s %s", from, split[0], split[1]);
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
        assert(file, "Missing file");
        assert(json, "Missing JSON");

        json = _.isString(json)?json:JSON.stringify(json, null, '\t');
        self.save(file, json);
    }
}
