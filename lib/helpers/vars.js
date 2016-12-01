var assert = require("assert");
var jsonPath = require('JSONPath');
var _ = require('lodash');
var debug = require("debug")("meta4qa:helps:vars");
var hbs = require('handlebars');
var sha256 = require('js-sha256');

var self = module.exports = {

    $: function(source, ctx) {
        assert(source, "Missing source template");
        assert(ctx, "Missing context");
        assert(_.isString(source), "Template not string")
        assert(_.isObject(ctx), "Invalid context object");

        var template = hbs.compile(source);
        return template(ctx);
    },

    scope: function(scope) {
        return _.extend({ vars: {} }, scope, new Events.EventEmitter() );
    },

    uuid: function (string) {
        return sha256(string);
    },

    capitalize: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    sanitize: function (txt, subst) {
        if (!txt) return "";
        subst = subst || "";
        return txt.replace(/\W/g, subst);
    },

    findNamed:function (scope, name) {
        name = name.trim();
        var found = self.find(scope, name);
        if (found) return found;
        return self.findInPath(scope, name);
        return self.get(scope, name);
    },

    findInPath :function (body, path) {
        var json = _.isString(body)?JSON.parse(body):body;
        var found = jsonPath({resultType: 'all'}, path, json);
        return (found.length > 0) ? found[0].value : undefined;
    },

    findAllInPath :function (body, path) {
        var json = _.isString(body)?JSON.parse(body):body;
        var found = jsonPath({resultType: 'all'}, path, json);
        var all = [];
        _.each(found, function(item) {
            all.push(item.value);
        })
        return all;
    },

    find: function(scope, name) {
        assert(scope, "missing scope");
        assert(_.isObject(scope), "Invalid scope object");
        assert(name, "missing var name");

        if (name.indexOf("this.")==0) {
            name = name.substring(5);
            return self.get(scope,name);
        }
        return self.get(scope.vars,name) || self.get(scope,name);
    },

    synonym: function(model, synoyms) {
        assert(model, "Missing model");
        if (!synoyms) return false;

        for(var s in synoyms) {
            var v = synoyms[s];
            if (model[v]) {
                return true;
            }
        }
        return false;
    },

    leaking: function(key) {
        Object.defineProperty(global, key, {
            set : function(value) {
                throw new Error("Global Leak: "+key);
            }
        });
    },

    split: function(s) {
        s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        s = s.replace(/^\./, '');           // strip a leading dot
        return s.split('.');
    },

    get: function(o, s) {
        var a = self.split(s);
        if (!a.length) return false;

        for (var i = 0, n = a.length; i < n; ++i) {
            var k = a[i];
            if (o && k in o) {
                o = o[k];
            } else {
                return;
            }
        }
        return o;
    },

    set: function(o, s, v) {
        var k, a = self.split(s);
        if (!a.length) return false;

        for (var i = 0, n = a.length-1; i < n; ++i) {
            k = a[i];
            o = o[k] = o[k] || {};
        }
        k = a[a.length-1]
        o[k] = v;
        return o[k];
    },

    env: function(prefix, env, config) {
        // iterate through 'env' adding prefixed properties to 'config'
        env = env || process.env || {};
        for(k in env) {
            var v = env[k];
            if (k.indexOf(prefix)===0) {
                var key = k.toLowerCase().replace(/_/g, ".").substring(prefix.length);
                assert(v = self.set(config, key, v), "ENV path not set");
            }
        }
        return config;
    },

    clean: function(mess) {
        var res = {};
        if (!mess) return res;

        Object.getOwnPropertyNames(mess).forEach(function(key) {
            res[key] = mess[key];
        }, mess);
        return res;
    }
};

// SELF TESTS

var test = {}
assert(self.set(test, "hello.world", "hi")=="hi", "No Hi");
assert(test.hello, "No Hello")
assert(test.hello.world, "No Hello World")
assert(test.hello.world=="hi", "No Hi World")

self.env("AFFIRM_", { "AFFIRM_HELLO_WORLD": "greetings" }, test)
assert(test.hello.world=="greetings", "No Greeting")
