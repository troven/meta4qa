var _ = require('lodash');

module.exports = function(raw,done) {
    done(null, JSON.parse(raw) );
}