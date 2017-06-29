var hbs = require('handlebars');
var debug = require('debug')('dialect:helper:hbs');

hbs.registerHelper('sanitize', function (text) {
    if (!text) { return ''; }
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/(on\w+="[^"]*")*(on\w+='[^']*')*(on\w+=\w*\(\w*\))*/gi, '');

    return new hbs.SafeString(text);
});

hbs.registerHelper('uid', function (text) {
    if (!text) { return ''; }
    text = text.replace(/\W/g, '_');
    return new hbs.SafeString(text);
});

hbs.registerHelper('UID', function (text) {
    if (!text) { return ''; }
    text = text.replace(/\W/g, '_').toUpperCase();
    return new hbs.SafeString(text);
});

hbs.registerHelper('simple_url', function (text) {
    if (!text) { return ''; }
    var ix = text.indexOf("/{");
    text = text.substring(0,ix)+"/*";
    return new hbs.SafeString(text);
});


hbs.registerHelper('json', function (text) {
    if (!text) { return ''; }
    return JSON.stringify(text, null, '\t');
});

hbs.registerHelper('escape', function (value) {
    var text = hbs.Utils.escapeExpression(value);
    return new hbs.SafeString(text);
});

hbs.registerHelper('upper', function (value) {
    var text = value.toUpperCase();
    return new hbs.SafeString(text);
});

hbs.registerHelper('lower', function (value) {
    var text = value.toLowerCase();
    return new hbs.SafeString(text);
});

hbs.logger.log = debug;