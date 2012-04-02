var events = require('events');

var eventEmitter = new events.EventEmitter();

function get() {

    return eventEmitter;
}

exports.get = get;

