var assert = require('assert');
var request = require('request'); // https://github.com/request/request
var _ = require('lodash');
var fs = require('fs');
var debug = require("debug")("meta4qa:helps:http");

var jsonPath = require('JSONPath');
var DOM = require('xmldom').DOMParser;
var path = require('path');
var files = require("./files");
//var xpath = require('xpath');
var crypto = require('crypto');

var http = module.exports;

http._cookies = {};

http.cookies = function(name) {
    (name=name===true||name == undefined)?"default":name;
    return http._cookies[name] = http._cookies[name]?http._cookies[name]:request.jar();
}

http.getClientAddress = function (req) {
    assert(req, "Missing request");
    assert(req.connection, "Missing connection");
    return (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
}

http.authorize = function (request, agent) {
    assert(request, "missing request");
    assert(agent, "missing agent");
    assert(agent.username, "missing agent username");
    assert(agent.password, "missing agent password");
    var base64 = new Buffer(agent.username + ':' + agent.password).toString('base64');
    return request.headers.Authorization = 'Basic ' + base64;
}

http.bearer= function (request, token) {
    assert(request, "missing request");
    assert(token, "missing token");
    return request.headers.Authorization = 'Bearer' + token;
}

http.client_credentials = function(scope, agent, done) {
    assert(scope, "missing scope");
    assert(agent, "missing agent");
    assert(done, "missing callback done()");
    assert(agent.oauth, "missing agent oauth");
    assert(agent.oauth.url, "missing agent oauth URL");

    request({
        url: agent.oauth.url,
        method: agent.oauth.method || 'POST',
        form: {
            'client_id': agent.oauth.client_id || agent.oauth.username,
            'client_secret': agent.oauth.client_secret || agent.oauth.password,
            'grant_type': agent.oauth.grant_type || 'client_credentials'
        }
    }, function(err, res) {
        if (err) {
            throw err;
            //done && done(err);
            //return;
        }
        var json = JSON.parse(res.body);
        debug("OAUTH response: %j", json);
        done && done(null, json);
    });
}

http.url = function (resource, options, target) {
    assert(resource, "missing resource");
    assert(options, "missing options");
    assert(target, "missing target");

    var url = false;
    target = _.extend({ cookie: http.cookies(), protocol: "http", hostname: "localhost", basePath: "/" }, target);
    target.protocol = target.protocol.toLowerCase();

    if (!target.port && target.protocol == "https") target.port = 443;

    if (resource.indexOf("://")<0) {
        var host = target.protocol + "://" + target.hostname + (target.port > 0 ? ":" + target.port : "");
        var basePath = (target.basePath || target.path || "");
        url = options.url || (host + (basePath+resource).replace(/\/+/g,"/"));
        debug("Using target URL %s", url);
    } else {
        url = resource;
        debug("Using absolute URL %s", url);
    }
    return url;
}

http.proxyURL = function (cmd, options) {
    assert(cmd, "Missing HTTP command")
    if (!options || !options.hostname) {
        return;
    }

    // var proxyUser = options.username?encodeURIComponent(options.username):"";
    // var proxyPassword = options.password?encodeURIComponent(options.password):"";
    // var proxyCredentials = proxyUser + (proxyPassword?":"+proxyPassword:"");

    var proxyCredentials = options.username+":"+options.password;

//(proxyCredentials?proxyCredentials+"@":"") +
    var proxyUrl = options.protocol + "://"+options.hostname+(options.port?":"+options.port:"");
    cmd.proxy = proxyUrl;
    options.url = options.proxyUrl;

    var token = 'Basic ' + new Buffer(proxyCredentials).toString('base64');
    cmd.headers['Proxy-Authorization'] = token;

    debug("VIA %s proxy: %s as %s", options.protocol, proxyUrl, token);
}

http.command = function (method, resource, options, target) {
    assert(method, "missing method");
    assert(resource, "missing resource");
    assert(options, "missing options");

    options.url = http.url(resource, options, target);
    cmd = _.extend({
        method: method,
        jar: options.cookies || target.cookies,
        headers: {},
        strictSSL: false,
        followRedirect: false,
        qs: {}
    },options);

    http.proxyURL( cmd, _.extend({}, target.proxy, options.proxy) );

    return cmd;
}

http.handleResponse = function (self, done) {
    assert(self, "missing scope");
    assert(done, "missing done() callback");
    self.stopwatch.start = _.now();

    return function (error, response) {
        self.stopwatch.stop = _.now();
        self.stopwatch.duration = self.stopwatch.stop - self.stopwatch.start;
        _.extend(self.response, response);
        if (error || self.response.statusCode==500) {
            self.error = error;
            debug("ERROR (%j) from %s in %s ms", error || self.response, self.response.url, self.stopwatch.duration);
            done && done(error, response);
            return;
        }

        //, (response.body || "No Response Body")
        debug("HTTP response (%s) from %s in %s ms", self.response.statusCode, self.request.url, self.stopwatch.duration );
//debug("BODY: %j", self.response);
        done && done(false, response);
    };
}

http.download = function (self, file, done) {
    assert(self, "missing self");
    assert(file, "missing file");
    assert(done, "missing done() callback");

    return function (error, response) {
        if (error) {
            self.error = error;
            debug("ERROR (%s) from %s in %s ms", error, self.request.url, self.stopwatch.duration);
            done && done(error, response);
            return;
        }

        //, (response.body || "No Response Body")
        debug("HTTP response (%s) from %s in %s ms", self.response.statusCode, self.request.url, self.stopwatch.duration );
        helps.files.save(file, JSON.stringify(payload));
//debug("BODY: %j", self.response);
        done && done(false, response);
    };
}
http.certificate = function (request, cert, options, rootDir) {
    assert(request, "missing request");
    assert(cert, "missing cert");
    assert(options, "missing options");
    assert(rootDir, "missing rootDir");

    assert(cert.key, "Missing certificate key");
    assert(cert.cert, "Missing certificate");

    var isRawPEM = function(pem) {
        return pem.indexOf("-----BEGIN")==0;
    }

    var certFile = path.join(rootDir, cert.cert);
    var certKeyFile = path.join(rootDir, cert.key);

    var certConfig = {
        agentOptions: {
        },
        requestCert: true,
        strictSSL: false,
        rejectUnauthorized: false
    };

    if (isRawPEM(cert.key)) {
        certConfig.agentOptions.key = cert.key;
    } else {
        assert(files.exists(certKeyFile), "No certificate key: "+certKeyFile);
        certConfig.agentOptions.key = fs.readFileSync(certKeyFile, "UTF-8");
        debug("Loaded certificate key: "+certKeyFile);
    }

    if (isRawPEM(cert.cert)) {
        certConfig.agentOptions.cert = cert.cert;
        debug("Loaded certificate: "+certFile);
    } else {
        assert(files.exists(certFile), "No certificate: "+certFile);
        certConfig.agentOptions.cert = fs.readFileSync(certFile, "UTF-8");
        debug("Loaded certificate: "+certFile);
    }

    if (cert.ca) {
        var caFile = path.join(rootDir, cert.ca);
        certConfig.agentOptions.ca = isRawPEM(cert.ca)?cert.ca:fs.readFileSync(caFile, "UTF-8");
    }
    if (cert.passphrase) {
        certConfig.agentOptions.passphrase = cert.passphrase;
    }
    _.extend(request, certConfig, options);
    return certConfig;
}

http.detectContentType = function (payload) {
    if (_.isObject(payload)) return "json";

    try {
        JSON.parse(payload);
        return 'json';
    } catch (e_json) {
        debug("%s NOT JSON: %s", payload, e_json);
        try {
//            new DOM().parseFromString(payload);
            return 'xml';
        } catch (e_xml) {
            debug("detectContentType:\nJSON: %s\nXML: %s", e_json, e_xml);
            return "string";
        }
    }
};

http.parse = function (payload) {
    try {
        return JSON.parse(payload);
    } catch (e) {
        return new DOM().parseFromString(payload);
    }
};

http.detectFileType = function (file) {
    var ix = file.lastIndexOf(".");
    if (ix<0) return "";
    return file.substring(ix+1).toLowerCase();
}

http.header = function (request, name, value) {
    assert(request, "Missing request");
    assert(name, "Missing name");
    request.headers[name] = value;
    return request.headers;
}

http.findInPath = function (body, path) {
    var json = _.isString(body)?JSON.parse(body):body;
    var found = jsonPath({resultType: 'all'}, path, json);
    return (found.length > 0) ? found[0].value : undefined;
};

/**
 * @return {boolean}
 */
http.IsStatusCodeXX = function(statusXX, statusCode) {
    if (statusXX.indexOf("xx")>0) {
        return statusCode >= (statusXX[0] * 100) && statusCode <= 99 + (statusXX[0] * 100);
    } else return statusCode == statusXX;
}