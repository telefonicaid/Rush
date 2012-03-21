var G = require('./my_globals').C;
var events = require('events');


function get() {
    var eventEmitter = new events.EventEmitter();

    eventEmitter.on(G.EVENT_NEWSTATE, function newstate(data) {
        console.log("eNEW STATE ARRIVED");
        console.dir(data);
    });

    eventEmitter.on(G.EVENT_ERR, function newstate(data) {
        console.log("eNEW ERROR ARRIVED");
        console.dir(data);
    });

    return eventEmitter;
}

exports.get = get;

