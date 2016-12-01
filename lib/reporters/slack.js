var _ = require('lodash');
var assert = require("assert");
var request = require("request");

module.exports = function(runner, config, options) {
    assert(runner, "Missing Runner");
    assert(config, "Missing Config");

    options = options || config.slack || {};

    assert(options.url, "Missing Slack URL");

    var payload = _.extend({
        "channel": "#testing",
        "username": "affirm-bot",
        "text": "Test Message",
        "icon_emoji": ":ghost:",
        "attachments": [
            {
        //        "fallback": "Required plain-text summary of the attachment.",
        //        "color": "#36a64f",
        //        "pretext": "Optional text that appears above the attachment block",
        //        "author_name": "Affirm Test Bot",
        //        "author_link": "http://flickr.com/bobby/",
        //        "author_icon": "http://flickr.com/icons/bobby.jpg",
        //        "title": "Slack API Documentation",
        //        "title_link": "https://api.slack.com/",
        //        "text": "Optional text that appears within the attachment",
        //        "fields": [
        //            {
        //                "title": "Priority",
        //                "value": "High",
        //                "short": false
        //            }
        //        ],
        //        "image_url": "http://my-website.com/path/to/image.jpg",
        //        "thumb_url": "http://example.com/path/to/thumb.png",
        //        "footer": "Slack API",
        //        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
        //        "ts": 123456789
            }
        ]
    },options.params);

//     return {
//         started: function(test) {
//             var msg = _.extend({}, payload);
//             msg.text = "Executing: "+test.title;
//             delete msg.attachments;
//             msg.icon_emoji = ":golf:";
//             //console.log("Slack feature: %s -> %j", msg.text, feature);
//
//             request({ method: "POST", url: options.url, json: msg }, function() {
// //                console.log("Slack: %s -> %j -> %j", msg.text, msg, arguments);
//             })
//
//         },
//         success: function(test) {
//             var msg = _.extend({}, payload);
//             msg.text = "Success";
//             msg.attachments[0].title = test.title;
//             msg.icon_emoji = ":heavy_check_mark:";
//
//             request({ method: "POST", url: options.url, json: msg }, function() {
// //                console.log("Slack: %s -> %j -> %j", msg.text, msg, arguments);
//             })
//
//         },
//         failure: function(test) {
//             var msg = _.extend({}, payload);
//             msg.text = "Test Suite Failed";
//             msg.attachments[0].title = test.title;
//             msg.icon_emoji = ":x:";
//
//             request({ method: "POST", url: options.url, json: msg }, function() {
// //                console.log("Slack: %s -> %j -> %j", msg.text, msg, arguments);
//             })
//
//         },
//         finished: function(test) {
//             var msg = _.extend({}, payload);
//             msg.text = "Test Finished";
//             if (test) {
//                 msg.attachments[0].title = test.title;
//                 msg.icon_emoji = ":heavy_check_mark:";
//             }
// console.log("Slack Finished: %s -> %j -> %j", msg.text, _.keys(this), arguments);
//
//             request({ method: "POST", url: options.url, json: msg }, function() {
//                 //console.log("Slack: %s -> %j -> %j", msg.text, msg, arguments);
//             })
//
//         },
//
//     };
}