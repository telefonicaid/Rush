var G = require('./my_globals').C;
var events = require('events');
exports.eventEmitter = new events.EventEmitter();


exports.eventEmitter.on(G.EVENT_NEWSTATE, function newstate(data){
    console.log("NEW STATE ARRIVED");
    console.dir(data);
});

exports.eventEmitter.on(G.EVENT_ERR, function newstate(data){
    console.log("NEW ERROR ARRIVED");
    console.dir(data);
});